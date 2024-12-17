// multi-dimensional query API

const express = require('express');
const mdq_api_router = express.Router();

mdq_api_router.post('/mdx', async (request, response) => {

  const { mdx } = request.body;

  console.log(mdx);

  response.status(200).json({ website: 'www.euclidolap.com' });

});

module.exports = mdq_api_router;
