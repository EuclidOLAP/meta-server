const express = require('express');
const router = express.Router();

const sequelize_conn = require('../../config/database');

const Dimension = require('../../models/Dimension'); // 引入维度模型
const Hierarchy = require('../../models/Hierarchy');
const Level = require('../../models/Level');
const Member = require('../../models/Member');

// 新增：获取所有维度的接口
router.get('/dimensions', async (req, res) => {
  try {
    const dimensions = await Dimension.findAll(); // 查询所有维度
    res.json({ success: true, data: dimensions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dimensions', error });
  }
});

// POST 请求，创建维度对象
router.post('/dimension', async (req, res) => {
  /**
   * 当一个非度量Dimension被创建时，同时还要创建：1、默认Hierarchy，2、Root Level，3、Root Member
   * 然后更新Dimension的defaultHierarchyGid
   */

  const { name } = req.body;
  let new_dimension_name = name;
  const dimension_type = 'NOT_MEASURE_DIMENSION';

  const transaction = await sequelize_conn.transaction();

  try {
    // Dimension：name, type, default_hierarchy_gid
    const dimension = await Dimension.create({ name: new_dimension_name, type: dimension_type }, { transaction });

    // Hierarchy：name, dimension_gid
    const default_hierarchy = await Hierarchy.create({
      name: new_dimension_name,
      dimensionGid: dimension.gid
    }, { transaction });

    // Level：name, dimension_gid, hierarchy_gid, level
    const root_level = await Level.create({
      name: 'root-level',
      dimensionGid: dimension.gid,
      hierarchyGid: default_hierarchy.gid,
      level: 0
    }, { transaction });

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

    // 提交事务
    await transaction.commit();

    // 返回成功的响应
    res.status(201).json({
      dimension: dimension,
      hierarchy: default_hierarchy,
      level: root_level,
      member: root_member
    });

  } catch (error) {
    await transaction.rollback(); // 如果出现任何错误，回滚事务
    console.error(error.message);
    res.status(500).json({ error: 'Failed to create dimension with related data', details: error.message });
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
