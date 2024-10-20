// const sequelize_conn = require('../config/database');
const Dimension = require('../models/Dimension');

// 直接使用模型进行数据操作，不执行 sync()
Dimension.create({
  code: '财务科目（测试）',
  name: 'Geography',
  description: 'Geographical dimension',
  type: 'NOT_MEASURE_DIMENSION'
})
.then(dimension => {
  console.log("New dimension added: ", dimension.toJSON());
})
.catch(err => {
  console.error('Error inserting dimension:', err);
});