@echo off

:: 配置 gRPC 服务地址和 proto 文件路径
SET server=dev.vm:50051
SET proto_path=D:\_temp
SET proto_file=olapmeta.proto


echo ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>  get all cubes  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" ^
    -d "{}" ^
    %server% olapmeta.OlapMetaService/GetAllCubes