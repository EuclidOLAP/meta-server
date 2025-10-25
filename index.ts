import { startup_olap_meta_service } from "./src/startup-service";
import { upload_measures_to_alioss } from "./src/batch/upload-measures-to-alioss";

if (process.env.UPLOAD_MEASURES_TO_ALIYUNOSS_ENABLED === "true") {
  upload_measures_to_alioss();
} else {
  startup_olap_meta_service();
}
