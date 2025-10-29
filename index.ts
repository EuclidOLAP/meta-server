import { startup_olap_meta_service } from "./src/startup-service";
import { upload_measures_to_alioss } from "./src/batch/upload-measures-to-alioss";
import { generate_vce_measure_slices } from "./src/batch/generate-vce-measure-slices";

if (process.env.UPLOAD_MEASURES_TO_ALIYUNOSS_ENABLED === "true") {
  upload_measures_to_alioss();
} else if (process.env.GEN_VCE_MEASURES_ENABLED === "true") {
  generate_vce_measure_slices();
} else {
  startup_olap_meta_service();
}
