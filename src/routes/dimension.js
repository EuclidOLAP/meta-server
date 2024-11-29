const express = require('express');
const router = express.Router();

const sequelize_conn = require('../../config/database');

const Dimension = require('../../models/Dimension'); // 引入维度模型
const Hierarchy = require('../../models/Hierarchy');
const Level = require('../../models/Level');
const Member = require('../../models/Member');
const Cube = require('../../models/Cube');
const DimensionRole = require('../../models/DimensionRole');

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

router.get('/dimensionRoles', async (req, res) => {
  try {
    const dimensionRoles = await DimensionRole.findAll(); // 查询所有维度
    res.json({ success: true, data: dimensionRoles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dimensions', error });
  }
});

const do_create_dimension = async ({ name, defaultHierarchyName, levels, type, transaction }) => {
  defaultHierarchyName = defaultHierarchyName || name;
  levels = levels || [];

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

    // Level：name, dimension_gid, hierarchy_gid, level
    const root_level = await Level.create({
      name: 'root-level',
      dimensionGid: dimension.gid,
      hierarchyGid: default_hierarchy.gid,
      level: 0
    }, { transaction });

    for (const [index, level_name] of levels.entries()) {
      const _level = await Level.create({
        name: level_name,
        dimensionGid: dimension.gid,
        hierarchyGid: default_hierarchy.gid,
        level: index + 1
      }, { transaction });
    }

    // Member：name, dimension_gid, hierarchy_gid, level_gid, level, parent_gid
    const root_member = await Member.create({
      name: 'ROOT',
      dimensionGid: dimension.gid,
      hierarchyGid: default_hierarchy.gid,
      levelGid: root_level.gid,
      level: 0,
      parentGid: 0 // Root Member 没有父节点
    }, { transaction });

    // 更新 Dimension 的 defaultHierarchyGid 字段
    await dimension.update({ defaultHierarchyGid: default_hierarchy.gid }, { transaction });

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
        parentGid: root_member.gid
      }, { transaction });
    }

    for (const dimensionRoleInfo of dimensionRoles) {
      for (const role_str of dimensionRoleInfo.roles) {
        let _dimensionRole = await DimensionRole.create({
          name: role_str,
          dimensionGid: dimensionRoleInfo.dimensionGid,
          cubeGid: cube.gid
        }, { transaction });
      }
    }

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

  const { name, defaultHierarchyName, levels } = req.body;

  const transaction = await sequelize_conn.transaction();

  // 度量维度会在构建Cube时自动创建，凡是调用API创建的维度，都是非度量维度
  const result = await do_create_dimension({ name, defaultHierarchyName, levels, type: 'NOT_MEASURE_DIMENSION', transaction });

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

// create a new child dimension member
router.post('/child-member', async (req, res) => {
  const { newChildMemberName, parentGid } = req.body;
  const parentMember = await Member.findByPk(parentGid);

  let childMemberLevel = await Level.findOne({
    where: {
      hierarchyGid: parentMember.hierarchyGid,
      level: parentMember.level + 1,
    }
  });

  const transaction = await sequelize_conn.transaction();
  try {
    if (!childMemberLevel) {
      const dimension = await Dimension.findByPk(parentMember.dimensionGid);
      const hierarchy = await Hierarchy.findByPk(parentMember.hierarchyGid);
      childMemberLevel = await Level.create({
        name: `${dimension.name} ${hierarchy.name} level ${parentMember.level + 1}`,
        dimensionGid: dimension.gid,
        hierarchyGid: hierarchy.gid,
        level: parentMember.level + 1,
      }, { transaction });
    }

    // Member：name, dimension_gid, hierarchy_gid, level_gid, level, parent_gid
    const newChildMember = await Member.create({
      name: newChildMemberName,
      dimensionGid: parentMember.dimensionGid,
      hierarchyGid: parentMember.hierarchyGid,
      levelGid: childMemberLevel.gid,
      level: childMemberLevel.level,
      parentGid: parentGid
    }, { transaction });

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


module.exports = router;
