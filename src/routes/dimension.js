const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const router = express.Router();

const sequelize_conn = require('../../config/database');

const Dimension = require('../../models/Dimension'); // 引入维度模型
const Hierarchy = require('../../models/Hierarchy');
const Level = require('../../models/Level');
const Member = require('../../models/Member');
const Cube = require('../../models/Cube');
const DimensionRole = require('../../models/DimensionRole');
const CalculatedMetric = require('../../models/CalculatedMetric');
const AdhocQuery = require('../../models/AdhocQuery');
const Dashboard = require('../../models/Dashboard'); // 新增Dashboard模型引入

// 新增：获取所有维度的接口
router.get('/dimensions', async (req, res) => {
  try {
    const dimensions = await Dimension.findAll(); // 查询所有维度
    res.json({ success: true, data: dimensions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dimensions', error });
  }
});

router.get('/cubes', async (req, res) => {
  try {
    const cubes = await Cube.findAll();
    res.json({ success: true, data: cubes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dimensions', error });
  }
});

// 获取指定 Cube 的容量信息
router.get('/cube/:gid/capacity', async (req, res) => {
  const cubeGid = req.params.gid;

  try {
    // 查询cube关联的全部DimensionRoles（不包括Measure DimensionRole）
    let dimensionRoles = await DimensionRole.findAll();
    dimensionRoles = dimensionRoles.filter(dr => {
      dr = dr.dataValues;
      return parseInt(cubeGid) === dr.cubeGid && dr.measureFlag === 0;
    });
    // 遍历DimensionRoles，查询其对应的Default Hierarchy
    let totalProduct = BigInt(1);

    for (let dr of dimensionRoles) {
      dr = dr.dataValues;

      let dimension = await Dimension.findByPk(dr.dimensionGid);
      dimension = dimension.dataValues;

      const hierarchy = await Hierarchy.findByPk(dimension.defaultHierarchyGid);
      // 查询Hierarchy下全部leaf Member的数量
      const count = await Member.count({
        where: {
          hierarchyGid: hierarchy.dataValues.gid,
          leaf: true
        }
      });

      // 将全部leaf Member的数量相乘，得出结果
      totalProduct *= BigInt(count);
    }

    res.json({
      success: true,
      capacity: totalProduct.toString()
    });

  } catch (error) {
    console.error('Error fetching cube capacity:', error);
    res.status(500).json({ success: false, message: 'Error fetching cube capacity', error });
  }
});

// 根据 Cube GID 和 预期度量记录数量生成 Cube 度量数据
router.post('/cube/:gid/generate-measures', async (req, res) => {
  const cubeGid = parseInt(req.params.gid);
  const { expectedMeasureRecords } = req.body;

  class OlapVectorGenerator {

    constructor(expectedMeasureRecords) {
      this.expectedMeasureRecords = expectedMeasureRecords;
      this.leaf_members_matrix = [];
      this.range_counters = [];
    }

    push(leaf_members) {
      this.leaf_members_matrix.push(leaf_members);
      this.range_counters.push(0);
    }

    next() {
      if (this.expectedMeasureRecords === 0)
        return null;

      const vector_pos = [];

      for (let i = 0; i < this.range_counters.length; i++) {
        vector_pos.push(this.leaf_members_matrix[i][this.range_counters[i]]);
      }

      for (let j = 0; j < this.range_counters.length; j++) {
        const i = this.range_counters.length - (j + 1);
        if (this.range_counters[i] < this.leaf_members_matrix[i].length - 1) {
          this.range_counters[i]++;
          break;
        }
        this.range_counters[i] = 0;
      }

      this.expectedMeasureRecords--;
      return vector_pos;
    }
  }

  const do_generate_measures = async (cubeGid, expectedMeasureRecords) => {
    // 根据cube gid取出全部非度量维度角色，对应到维度，对应到层级结构
    // let cube = await Cube.findByPk(cubeGid);
    // cube = cube.dataValues;

    // 创建一个定位器
    const ovg = new OlapVectorGenerator(expectedMeasureRecords);

    let dimensionRoles = await DimensionRole.findAll({
      where: {
        cubeGid: cubeGid,
        measureFlag: 0 // 非度量维度角色
      }
    });
    dimensionRoles = dimensionRoles.map(dr => dr.dataValues);
    // 按 gid 升序排序
    dimensionRoles.sort((a, b) => a.gid - b.gid);

    // 查询层级结构对应的全部leaf Members，按gid升序排列
    for (const dr of dimensionRoles) {
      const dimension = await Dimension.findByPk(dr.dimensionGid);
      const hierarchy_gid = dimension.defaultHierarchyGid;
      let leaf_members = await Member.findAll({
        where: {
          hierarchyGid: hierarchy_gid,
          leaf: true
        },
        order: [
          ['gid', 'ASC']
        ]
      });
      leaf_members = leaf_members.map(m => m.dataValues);
      ovg.push(leaf_members);
    }

    let measure_dim_role = await DimensionRole.findOne({
      where: {
        cubeGid: cubeGid,
        measureFlag: 1
      }
    });
    measure_dim_role = measure_dim_role.dataValues;
    let measure_members = await Member.findAll({
      where: {
        dimensionGid: measure_dim_role.dimensionGid,
        leaf: true
      },
      order: [
        ['gid', 'ASC']
      ]
    });
    measure_members = measure_members.map(m => m.dataValues);

    const vce_inputs_dir = path.join(process.cwd(), 'vce-inputs');

    try {
      // 尝试访问目录
      await fs.access(vce_inputs_dir);
      console.log('目录已存在:', vce_inputs_dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 如果目录不存在，则创建它
        await fs.mkdir(vce_inputs_dir);
        console.log('目录已创建:', vce_inputs_dir);
      } else {
        // 处理其他错误
        console.error('检查或创建目录时出错:', error);
      }
    }

    /**
     * 判断vce_inputs_dir目录下是否存在以cubeGid为前缀名称的文件，
     * 如果不存在，继续执行后续逻辑
     * 如果存在，报错并提示文件已存在，应该手动删除文件。
     */
    const files = await fs.readdir(vce_inputs_dir);
    const matchingFiles = files.filter(file => file.startsWith(cubeGid.toString()));
    if (matchingFiles.length > 0) {
      throw new Error(`文件已存在，请手动删除以 ${cubeGid} 为前缀的文件后再试。`);
    }

    /**
     * (euclid node) -> (child node)
     *
     * 4 bytes - data package capacity
     * 2 bytes - intention
     * N bytes - N = sizeof(InsertingMeasuresOptions), these bytes are a InsertingMeasuresOptions instance.
     * 8 bytes - cube g_id
     * 4 bytes - {DimRoles amount} - the number of coordinate axes, which is the number of dimension-roles.
     * 4 bytes - {MeasureMbrs amount} - the number of measure-dimension members.
     * (
     *     (4 bytes + 8 bytes * N) * {DimRoles amount}
     *         - The coordinate on the axis, which is the full path of the dimension member md_gid. (N > 0)
     *     (8 + 1 bytes) * {MeasureMbrs amount} - Measures values, and null-flag.
     * ) * V - 'V' represents the number of vectors inserted at one time. (V > 0)
     */
    // #define INTENT__INSERT_CUBE_MEASURE_VALS 4
    const intent_buff = Buffer.alloc(4 + 2 + 4 + 4 + 8 + 4 + 4);
    intent_buff.writeUInt32LE(0, 0); // 4 bytes - data package capacity
    intent_buff.writeUInt16LE(4, 4); // 2 bytes - intention // #define INTENT__INSERT_CUBE_MEASURE_VALS 4

    // N bytes - N = sizeof(InsertingMeasuresOptions)
    // intent_buff.writeUInt32LE(0, 6); // ReloadMeasures_Enable, // default
    intent_buff.writeUInt32LE(1, 6); // ReloadMeasures_Disable
    intent_buff.writeUInt32LE(0, 10); // int worker_id

    intent_buff.writeBigUInt64LE(BigInt(cubeGid), 14); // 8 bytes - cube g_id
    intent_buff.writeUInt32LE(dimensionRoles.length, 22); // 4 bytes - {DimRoles amount}
    intent_buff.writeUInt32LE(measure_members.length, 26); // 4 bytes - {MeasureMbrs amount}

    // 创建一个Buffer对象————intent_body_buff，其初始内存大小为2M
    let intent_body_buff = Buffer.alloc(2 * 1024 * 1024);
    let buff_num = 0;
    let currentOffset = 0;

    while (true) {
      const vector_pos = ovg.next();
      if (vector_pos === null)
        break;

      for (const member of vector_pos) {
        const bin_full_path = member.fullPath;
        const level = member.level;

        // level是一个int，将其拼接到Buffer中，占4个字节
        const levelBuffer = Buffer.alloc(4);
        levelBuffer.writeInt32LE(level, 0);
        // 将levelBuffer拼接到intent_body_buff后面
        levelBuffer.copy(intent_body_buff, currentOffset);
        currentOffset += levelBuffer.length;
        // 将bin_full_path拼接到intent_body_buff后面
        bin_full_path.copy(intent_body_buff, currentOffset);
        currentOffset += bin_full_path.length;
      }

      for (const mm of measure_members) {
        const mm_name = mm.name;
        let measureBuffer = Buffer.alloc(8);
        if (mm_name === "Count") {
          // 往vector_buffer后拼接一个8字节浮点数，值为1
          measureBuffer.writeDoubleLE(1.0, 0);  // 写入8字节浮点数1
        } else {
          // 往vector_buffer后拼接一个8字节随机浮点数
          measureBuffer.writeDoubleLE(10 + Math.random() * 100, 0);  // 写入8字节浮点数
        }
        // 往vector_buffer后拼接一个1字节整形，值为0
        const null_flag_buff = Buffer.alloc(1);
        null_flag_buff.writeUInt8(0, 0);

        // 将measureBuffer拼接到intent_body_buff后面
        measureBuffer.copy(intent_body_buff, currentOffset);
        currentOffset += measureBuffer.length;
        // 将null_flag_buff拼接到intent_body_buff后面
        null_flag_buff.copy(intent_body_buff, currentOffset);
        currentOffset += null_flag_buff.length;
      }

      /**
       * 如果 intent_body_buff 中的有效字节数超过1M，执行下面的逻辑：
       * 将 intent_buff 和 intent_body_buff 合并成一个新的Buffer，
       * 然后将 intent_buff 和 intent_body_buff 的总字节数写入到新的Buffer的前四个字节中（覆盖）。
       * 将新的Buffer写入到文件中（文件名为 ${cubeGid}-${buff_num} ）。
       * buff_num++
       * 将 intent_body_buff 清空
       */
      if (currentOffset > 1024 * 1024) {
        const combinedBuffer = Buffer.concat([intent_buff, intent_body_buff.slice(0, currentOffset)]);
        combinedBuffer.writeUInt32LE(combinedBuffer.length, 0);

        const filePath = path.join(vce_inputs_dir, `${cubeGid}-${buff_num}`);
        await fs.writeFile(filePath, combinedBuffer);

        console.log(`>>>>>>>>> ${filePath}`);

        buff_num++;
        intent_body_buff = Buffer.alloc(2 * 1024 * 1024);
        currentOffset = 0;
      }
    }

    /**
     * 将 intent_buff 和 intent_body_buff 合并成一个新的Buffer，
     * 然后将 intent_buff 和 intent_body_buff 的总字节数写入到新的Buffer的前四个字节中（覆盖）。
     * 将新的Buffer写入到文件中（文件名为 ${cubeGid}-${buff_num} ）。
     */
    const finalCombinedBuffer = Buffer.concat([intent_buff, intent_body_buff.slice(0, currentOffset)]);
    finalCombinedBuffer.writeUInt32LE(finalCombinedBuffer.length, 0);

    const finalFilePath = path.join(vce_inputs_dir, `${cubeGid}-${buff_num}`);
    await fs.writeFile(finalFilePath, finalCombinedBuffer);
    console.log(`>>>>>>>>> finalFilePath : ${finalFilePath}`);
  };

  try {
    do_generate_measures(cubeGid, expectedMeasureRecords);

    res.json({ success: true, message: 'Measures data are doing generated.' });
  } catch (error) {
    console.error('Error generating measure data:', error);
    res.status(500).json({ success: false, message: 'Error generating measure data', error });
  }
});

router.get('/dimensionRoles', async (req, res) => {
  try {
    const dimensionRoles = await DimensionRole.findAll(); // 查询所有维度
    res.json({ success: true, data: dimensionRoles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dimensions', error });
  }
});

const do_create_dimension = async ({ name, defaultHierarchyName, levels, membersTree, type, transaction }) => {
  defaultHierarchyName = defaultHierarchyName || name;
  levels = levels || [];
  membersTree = membersTree || [];

  /**
   * 当一个Dimension被创建时，同时还要创建：1、默认Hierarchy，2、Root Level，3、Root Member
   * 然后更新Dimension的defaultHierarchyGid
   */
  try {
    // Dimension：name, type, default_hierarchy_gid
    const dimension = await Dimension.create({ name, type }, { transaction });

    // Hierarchy：name, dimension_gid
    const default_hierarchy = await Hierarchy.create({
      name: defaultHierarchyName,
      dimensionGid: dimension.gid
    }, { transaction });

    const context = {
      dimension,
      hierarchy: default_hierarchy,
      levels: [],
    };

    // Level：name, dimension_gid, hierarchy_gid, level
    const root_level = await Level.create({
      name: 'root-level',
      dimensionGid: dimension.gid,
      hierarchyGid: default_hierarchy.gid,
      level: 0
    }, { transaction });

    context.levels.push(root_level);

    for (const [index, level_name] of levels.entries()) {
      const _level = await Level.create({
        name: level_name,
        dimensionGid: dimension.gid,
        hierarchyGid: default_hierarchy.gid,
        level: index + 1
      }, { transaction });
      context.levels.push(_level);
    }

    // Member：name, dimension_gid, hierarchy_gid, level_gid, level, parent_gid
    const root_member = await Member.create({
      name: 'ROOT',
      dimensionGid: dimension.gid,
      hierarchyGid: default_hierarchy.gid,
      levelGid: root_level.gid,
      level: 0,
      parentGid: 0, // Root Member 没有父节点
      leaf: false,
    }, { transaction });

    // 更新 Dimension 的 defaultHierarchyGid 字段
    await dimension.update({ defaultHierarchyGid: default_hierarchy.gid }, { transaction });

    if (membersTree && membersTree.length > 0) {
      asyncLocalStorage.enterWith(context);
      await createMembersTree(root_member, membersTree, transaction);
    }

    return {
      dimension,
      default_hierarchy,
      root_level,
      root_member
    };
  } catch (error) {
    console.error(error.message);
    return null;
  }
};

const createMembersTree = async (parent, children_fragments, transaction) => {

  // createChildMember
  for (const child_fragment of children_fragments) {
    let new_member = await createChildMember(parent, child_fragment.fragment, transaction);
    if (child_fragment.children && child_fragment.children.length > 0) {
      await createMembersTree(new_member, child_fragment.children, transaction);
    }
  }
};

// POST /api/cube - 创建一个新的Cube
router.post('/cube', async (req, res) => {

  const { cubeName, measures, dimensionRoles } = req.body;

  // 验证输入数据是否完整
  if (!cubeName || !Array.isArray(measures) || !Array.isArray(dimensionRoles)) {
    return res.status(400).json({ message: 'Invalid input data' });
  }

  const transaction = await sequelize_conn.transaction();

  try {
    const cube = await Cube.create({ name: cubeName }, { transaction });

    const { dimension, default_hierarchy, root_level, root_member } = await do_create_dimension({ name: 'Measures', type: 'MEASURE_DIMENSION', transaction });

    for (const measure_str of measures) {
      let _measureMember = await Member.create({
        name: measure_str,
        dimensionGid: dimension.gid,
        hierarchyGid: default_hierarchy.gid,
        levelGid: root_level.gid,
        level: root_level.level,
        parentGid: root_member.gid,
        measureIndex: measures.indexOf(measure_str),
        leaf: true,
      }, { transaction });
    }

    // 创建非度量维度角色
    for (const dimensionRoleInfo of dimensionRoles) {
      for (const role_str of dimensionRoleInfo.roles) {
        let _dimensionRole = await DimensionRole.create({
          name: role_str,
          dimensionGid: dimensionRoleInfo.dimensionGid,
          cubeGid: cube.gid
        }, { transaction });
      }
    }

    // 创建度量维度角色
    let _measureDimensionRole = await DimensionRole.create({
      name: 'Measures',
      dimensionGid: dimension.gid,
      cubeGid: cube.gid,
      measureFlag: 1 // It is a meaure dimension role.
    }, { transaction });

    // 提交事务
    await transaction.commit();

    // 返回成功的响应
    res.status(201).json({ ...cube.dataValues });

  } catch (error) {
    await transaction.rollback(); // 如果出现任何错误，回滚事务
    console.error(error.message);
    res.status(500).json({ error: 'Failed to build cube with related data', details: error.message });
  }
});

// POST 请求，创建维度对象
router.post('/dimension', async (req, res) => {
  /**
   * 当一个非度量Dimension被创建时，同时还要创建：1、默认Hierarchy，2、Root Level，3、Root Member
   * 然后更新Dimension的defaultHierarchyGid
   */
  const { name, defaultHierarchyName, levels, membersTree } = req.body;

  const transaction = await sequelize_conn.transaction();

  // 度量维度会在构建Cube时自动创建，凡是调用API创建的维度，都是非度量维度
  const result = await do_create_dimension({ name, defaultHierarchyName, levels, membersTree, type: 'NOT_MEASURE_DIMENSION', transaction });

  if (result) {
    // 提交事务
    await transaction.commit();

    // 返回成功的响应
    res.status(201).json({
      dimension: result.dimension,
      hierarchy: result.default_hierarchy,
      level: result.root_level,
      member: result.root_member
    });
  } else {
    await transaction.rollback(); // 如果出现任何错误，回滚事务
    res.status(500).json({ error: 'Failed to create dimension with related data' });
  }

});

// 获取指定维度的成员树结构
router.get('/dimension/:gid/members', async (req, res) => {
  const dimensionGid = req.params.gid;

  try {
    // 查询指定维度的所有成员
    const members = await Member.findAll({
      where: { dimensionGid }
    });

    const member_list = [];
    members.forEach((m) => {
      member_list.push({ ...m.dataValues });
    });

    res.json({ success: true, members: member_list });
  } catch (error) {
    console.error('Error fetching members for dimension:', error);
    res.status(500).json({ success: false, message: 'Error fetching members', error });
  }
});

const createChildMember = async (parent, childMemberName, transaction) => {

  const context = asyncLocalStorage.getStore();

  let childMemberLevel = context.levels[parent.level + 1];
  if (!childMemberLevel) {
    childMemberLevel = await Level.findOne({
      where: {
        hierarchyGid: parent.hierarchyGid,
        level: parent.level + 1,
      }
    });
  }

  if (!childMemberLevel) {
    let dimension = await Dimension.findByPk(parent.dimensionGid);
    dimension = dimension ? dimension : context.dimension;

    let hierarchy = await Hierarchy.findByPk(parent.hierarchyGid);
    hierarchy = hierarchy ? hierarchy : context.hierarchy;

    childMemberLevel = await Level.create({
      name: `${dimension.name} ${hierarchy.name} level ${parent.level + 1}`,
      dimensionGid: dimension.gid,
      hierarchyGid: hierarchy.gid,
      level: parent.level + 1,
    }, { transaction });
  }

  // Member：name, dimension_gid, hierarchy_gid, level_gid, level, parent_gid
  const child = await Member.create({
    name: childMemberName,
    dimensionGid: parent.dimensionGid,
    hierarchyGid: parent.hierarchyGid,
    levelGid: childMemberLevel.gid,
    level: childMemberLevel.level,
    parentGid: parent.gid,
    leaf: true,
  }, { transaction });

  await parent.update({ leaf: false }, { transaction });

  // 判断父节点是否是 root member
  if (parent.level === 0) {
    // 如果父节点是 root member，直接更新 child 的 fullPath 字段为其 gid
    const fullPathBuffer = Buffer.alloc(8);  // 创建一个 8 字节的 buffer
    fullPathBuffer.writeBigUInt64LE(BigInt(child.gid), 0);  // 将 gid 转换成 8 字节无符号整数
    await child.update({ fullPath: fullPathBuffer }, { transaction });
  } else {
    // 如果父节点不是 root member，拼接 parent 的 fullPath 和 child 的 gid
    const parentFullPath = parent.fullPath || Buffer.alloc(0);  // 获取父节点的 fullPath，默认为空
    const childFullPathBuffer = Buffer.alloc(parentFullPath.length + 8);  // 创建一个新的 buffer，长度为父节点 fullPath 长度 + 8 字节
    parentFullPath.copy(childFullPathBuffer, 0);  // 将父节点的 fullPath 复制到新的 buffer 中
    childFullPathBuffer.writeBigUInt64LE(BigInt(child.gid), parentFullPath.length);  // 将 child 的 gid 写入 buffer 的后 8 字节

    // 检查是否超出最大字节数
    if (childFullPathBuffer.length > 460) {
      throw new Error("Full path exceeds the maximum allowed size of 460 bytes.");
    }

    await child.update({ fullPath: childFullPathBuffer }, { transaction });  // 更新子节点的 fullPath
  }

  return child;
};

// create a new child dimension member
router.post('/child-member', async (req, res) => {
  const { newChildMemberName, parentGid } = req.body;
  const parentMember = await Member.findByPk(parentGid);
  const transaction = await sequelize_conn.transaction();
  try {
    const newChildMember = await createChildMember(parentMember, newChildMemberName, transaction);
    // 提交事务
    await transaction.commit();
    // 返回成功的响应
    res.status(201).json(newChildMember);
  } catch (error) {
    await transaction.rollback(); // 如果出现任何错误，回滚事务
    console.error(error.message);
    res.status(500).json({ error: 'Failed to create dimension with related data', details: error.message });
  }
});

// 获取指定 Dimension 下的所有 Hierarchy
router.get('/dimension/:gid/hierarchies', async (req, res) => {
  const dimensionGid = req.params.gid; // 从请求参数中获取 Dimension GID

  try {
    // 查找与指定 dimensionGid 相关的所有 Hierarchy
    const hierarchies = await Hierarchy.findAll({
      where: { dimensionGid }
    });

    // 构建返回的层级列表
    const hierarchyList = hierarchies.map(hierarchy => ({
      ...hierarchy.dataValues
    }));

    // 返回成功的响应
    res.json({ success: true, hierarchies: hierarchyList });
  } catch (error) {
    console.error('Error fetching hierarchies for dimension:', error);
    res.status(500).json({ success: false, message: 'Error fetching hierarchies', error });
  }
});

// 获取指定 Hierarchy 下的所有 Member
router.get('/hierarchy/:gid/members', async (req, res) => {
  const hierarchyGid = req.params.gid; // 从请求参数中获取 Hierarchy GID

  try {
    // 查找与指定 hierarchyGid 相关的所有 Member
    const members = await Member.findAll({
      where: { hierarchyGid }
    });

    // 构建返回的成员列表
    const memberList = members.map(member => ({
      ...member.dataValues
    }));

    // 返回成功的响应
    res.json({ success: true, members: memberList });
  } catch (error) {
    console.error('Error fetching members for hierarchy:', error);
    res.status(500).json({ success: false, message: 'Error fetching members', error });
  }
});

// POST 请求，创建一个新的 CalculatedMetric 实例
router.post('/calculated-metrics', async (req, res) => {

  const metric = req.body;

  let level = await Level.findOne({
    where: {
      hierarchyGid: metric.hierarchyGid,
      level: metric.level,
    }
  });

  // 如果没有对应Level，则创建Level，所以需要事务
  const transaction = await sequelize_conn.transaction();

  try {

    if (level === null) {
      // 如果没有对应Level，则创建Level
      level = await Level.create({
        name: `Level-${metric.level}`,
        dimensionGid: metric.dimensionGid,
        hierarchyGid: metric.hierarchyGid,
        level: metric.level,
      }, { transaction });
    }

    metric.levelGid = level.gid;

    // 创建新的 CalculatedMetric 实例
    const new_metric = await CalculatedMetric.create(metric, { transaction });

    // 提交事务
    await transaction.commit();

    // 返回成功的响应
    res.status(201).json({
      success: true,
      metric: new_metric
    });
  } catch (error) {
    await transaction.rollback(); // 如果出现任何错误，回滚事务
    console.error('Error creating CalculatedMetric:', error);
    res.status(500).json({ success: false, message: 'Failed to create CalculatedMetric', error });
  }
});

router.get('/calculatedMetrics/cube/:cube_gid', async (req, res) => {
  const cubeGid = req.params.cube_gid;

  try {
    const calculatedMetrics = await CalculatedMetric.findAll({
      where: { cubeGid: cubeGid }
    });

    res.json({
      success: true,
      metrics: calculatedMetrics.map(metric => {
        // ({ olapEntityType: 'CalculatedMetric', ...metric.dataValues })
        const metricData = metric.dataValues;
        if (!metricData.display)
          metricData.display = metricData.name;

        return { olapEntityType: 'CalculatedMetric', ...metricData };
      })
    });
  } catch (error) {
    console.error('Error fetching calculated metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calculated metrics',
      error: error.message
    });
  }
});

router.get('/dimension/:gid/default-hierarchy-root-member', async (req, res) => {
  const dimensionGid = req.params.gid;

  try {
    // 查询指定维度
    const dimension = await Dimension.findByPk(dimensionGid);
    if (!dimension) {
      return res.status(404).json({ success: false, message: 'Dimension not found' });
    }

    // 获取默认 Hierarchy 的 gid
    const defaultHierarchyGid = dimension.defaultHierarchyGid;

    // 查询默认 Hierarchy
    const defaultHierarchy = await Hierarchy.findByPk(defaultHierarchyGid);
    if (!defaultHierarchy) {
      return res.status(404).json({ success: false, message: 'Default Hierarchy not found' });
    }

    // 查询根层级
    const rootLevel = await Level.findOne({
      where: {
        hierarchyGid: defaultHierarchyGid,
        level: 0
      }
    });
    if (!rootLevel) {
      return res.status(404).json({ success: false, message: 'Root Level not found' });
    }

    // 查询根成员
    const rootMember = await Member.findOne({
      where: {
        hierarchyGid: defaultHierarchyGid,
        levelGid: rootLevel.gid,
        level: 0,
        parentGid: 0
      }
    });
    if (!rootMember) {
      return res.status(404).json({ success: false, message: 'Root Member not found' });
    }

    res.json({ success: true, rootMember: rootMember.dataValues });
  } catch (error) {
    console.error('Error fetching root member for dimension:', error);
    res.status(500).json({ success: false, message: 'Error fetching root member', error });
  }
});

router.post('/adhoc-query', async (req, res) => {
  const { uuid, name, cubeGid, jsonStr, raw_data_table_json_str } = req.body;

  try {
    const newAdhocQuery = await AdhocQuery.create({
      uuid,
      name,
      cubeGid,
      jsonStr,
      raw_data_table_json_str
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating AdhocQuery:', error);
    res.status(500).json({ success: false, message: 'Error creating AdhocQuery', error });
  }
});

router.get('/adhoc-queries', async (req, res) => {
  try {
    const adhocQueries = await AdhocQuery.findAll();
    res.json({ success: true, data: adhocQueries });
  } catch (error) {
    console.error('Error fetching AdhocQueries:', error);
    res.status(500).json({ success: false, message: 'Error fetching AdhocQueries', error });
  }
});

// 保存Dashboard的API
router.post('/dashboard', async (req, res) => {
  try {
    const data = req.body;
    // 创建或更新逻辑，根据需要调整
    // 这里简单用create演示
    const dashboard = await Dashboard.create(data);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error saving dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to save dashboard', error });
  }
});

// 查询Dashboard列表API
router.get('/dashboards', async (req, res) => {
  try {
    const dashboards = await Dashboard.findAll();
    res.json({ success: true, data: dashboards });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboards', error });
  }
});

module.exports = router;
