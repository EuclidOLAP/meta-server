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


module.exports = router;
