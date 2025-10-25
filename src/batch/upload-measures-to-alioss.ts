import { createOssClient, uploadBuffer } from "../oss-wrapper";
const Dimension = require("../models/Dimension"); // 引入维度模型
import Member from "../database/Member";
const DimensionRole = require("../models/DimensionRole");

class MeasuresGenerator {
  expectedMeasureRecords: number;
  leaf_members_matrix: any;
  range_counters: any;

  constructor(expectedMeasureRecords: number) {
    this.expectedMeasureRecords = expectedMeasureRecords;
    this.leaf_members_matrix = [];
    this.range_counters = [];
  }

  push(leaf_members: any) {
    this.leaf_members_matrix.push(leaf_members);
    this.range_counters.push(0);
  }

  adjust_beginning_position(beginning_position: number) {
    /**
     * leaf_members_matrix中每一个元素也是一个数组，
     * 总数 = 1
     * 遍历 leaf_members_matrix {
     *    总数 *= 当前元素.len
     * }
     * 计算得出总数
     */
    let totalElements = 1;
    for (let i = 0; i < this.leaf_members_matrix.length; i++) {
      totalElements *= this.leaf_members_matrix[i].length;
    }

    /**
     * 根据 expectedMeasureRecords 和 beginning_position 计算出 数据位置是否超出了 总数，
     * 如果超出抛异常，然后进程结束
     * 没超出的话继续往下执行
     */
    if (beginning_position + this.expectedMeasureRecords > totalElements) {
      console.error(
        `[Error] [process.exit(1);] Beginning position ${beginning_position} exceeds total possible records ${totalElements}.`
      );
      process.exit(1);
    }

    /**
     * 计算在第一次next()调用前，range_counters的起始位置应该是多少
     */
    const offsets: number[] = new Array(this.leaf_members_matrix.length).fill(
      1
    );
    for (let i = this.leaf_members_matrix.length - 2; i >= 0; i--) {
      offsets[i] = offsets[i + 1] * this.leaf_members_matrix[i + 1].length;
    }

    let beg_pos = beginning_position;
    for (let i = 0; i < this.leaf_members_matrix.length; i++) {
      this.range_counters[i] = BigInt(beg_pos) / BigInt(offsets[i]);
      beg_pos %= offsets[i];
      if (beg_pos === 0) break;
    }
  }

  next() {
    if (this.expectedMeasureRecords === 0) return null;

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

export async function upload_measures_to_alioss() {
  const bucket_region = process.env.OSSTBM_BUCKET_REGION;
  const bucket_name = process.env.OSSTBM_BUCKET_NAME;
  const access_key_id = process.env.OSSTBM_ACCESS_KEY_ID;
  const access_key_secret = process.env.OSSTBM_ACCESS_KEY_SECRET;
  const cube_gid = parseInt(process.env.OSSTBM_CUBE_GID || "0");
  const beginning_position = parseInt(
    process.env.OSSTBM_BEGINNING_POSITION || "0"
  );
  const expectedMeasureRecords = parseInt(
    process.env.OSSTBM_EXPECTED_MEASURE_RECORDS || "0"
  );

  const do_generate_measures = async (
    cubeGid: any,
    expectedMeasureRecords: any
  ) => {
    // 根据cube gid取出全部非度量维度角色，对应到维度，对应到层级结构
    // let cube = await Cube.findByPk(cubeGid);
    // cube = cube.dataValues;

    // 创建一个定位器
    const ovg = new MeasuresGenerator(expectedMeasureRecords);

    let dimensionRoles = await DimensionRole.findAll({
      where: {
        cubeGid: cubeGid,
        measureFlag: 0, // 非度量维度角色
      },
    });
    dimensionRoles = dimensionRoles.map((dr: any) => dr.dataValues);

    // 按 gid 升序排序
    // dimensionRoles.sort((a, b) => a.gid - b.gid);
    (dimensionRoles as any[]).sort((a: any, b: any) => a.gid - b.gid);

    // 查询层级结构对应的全部leaf Members，按gid升序排列
    for (const dr of dimensionRoles) {
      const dimension = await Dimension.findByPk(dr.dimensionGid);
      const hierarchy_gid = dimension.defaultHierarchyGid;
      let leaf_members = await Member.findAll({
        where: {
          hierarchyGid: hierarchy_gid,
          leaf: true,
        },
        order: [["gid", "ASC"]],
      });
      leaf_members = leaf_members.map((m: any) => m.dataValues);
      ovg.push(leaf_members);
    }

    // #######################################################################
    // ##                                                                   ##
    // #######################################################################
    ovg.adjust_beginning_position(beginning_position);

    let measure_dim_role = await DimensionRole.findOne({
      where: {
        cubeGid: cubeGid,
        measureFlag: 1,
      },
    });
    measure_dim_role = measure_dim_role.dataValues;
    let measure_members = await Member.findAll({
      where: {
        dimensionGid: measure_dim_role.dimensionGid,
        leaf: true,
      },
      order: [["gid", "ASC"]],
    });
    measure_members = measure_members.map((m: any) => m.dataValues);

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

    const BUFF_CAPACITY = 16 * 1024 * 1024;
    let intent_body_buff = Buffer.alloc(BUFF_CAPACITY);

    let buff_num = 0;
    let currentOffset = 0;

    let oss_cli = createOssClient(
      bucket_region,
      access_key_id,
      access_key_secret,
      bucket_name
    );

    const do_upload_slice_to_oss = async (
      intent_body_buff: any,
      oss_file_path: string
    ) => {
      const combinedBuffer = Buffer.concat([intent_buff, intent_body_buff]);
      combinedBuffer.writeUInt32LE(combinedBuffer.length, 0);

      while (true) {
        try {
          await uploadBuffer(oss_cli, oss_file_path, combinedBuffer);
          break;
        } catch (error) {
          console.error(
            "############################# 上传文件到OSS失败，重试中...",
            error
          );

          await new Promise((resolve) => setTimeout(resolve, 3000));

          oss_cli = createOssClient(
            bucket_region,
            access_key_id,
            access_key_secret,
            bucket_name
          );
        }
      }

      console.log(`>>>>>>>>> ${oss_file_path}`);
    };

    while (true) {
      const vector_pos = ovg.next();
      if (vector_pos === null) break;

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
          measureBuffer.writeDoubleLE(1.0, 0); // 写入8字节浮点数1
        } else {
          // 往vector_buffer后拼接一个8字节随机浮点数
          measureBuffer.writeDoubleLE(10 + Math.random() * 100, 0); // 写入8字节浮点数
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
      if (currentOffset > BUFF_CAPACITY / 2) {
        await do_upload_slice_to_oss(
          intent_body_buff.slice(0, currentOffset),
          `/measures${cubeGid}/${beginning_position}_${expectedMeasureRecords}/part-${buff_num}`
        );

        buff_num++;
        currentOffset = 0;
      }
    }

    // 将最后残余数据上传至OSS
    await do_upload_slice_to_oss(
      intent_body_buff.slice(0, currentOffset),
      `/measures${cubeGid}/${beginning_position}_${expectedMeasureRecords}/part-${buff_num}`
    );
  };

  await do_generate_measures(cube_gid, expectedMeasureRecords);
}
