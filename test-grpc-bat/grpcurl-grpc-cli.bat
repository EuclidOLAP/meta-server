@echo off

:: 配置 gRPC 服务地址和 proto 文件路径
SET server=dev.vm:50051
SET proto_path=D:\_temp
SET proto_file=olapmeta.proto

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"gid\": 500000000000001}" %server% olapmeta.OlapMetaService/GetCubeByGid

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"gid\": 500000000000002}" %server% olapmeta.OlapMetaService/GetCubeByGid

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"gid\": 500000000000003}" %server% olapmeta.OlapMetaService/GetCubeByGid

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"gid\": 500000000099999}" %server% olapmeta.OlapMetaService/GetCubeByGid

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"name\": \"CCC\"}" %server% olapmeta.OlapMetaService/GetCubeByName

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"name\": \"C2\"}" %server% olapmeta.OlapMetaService/GetCubeByName

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"name\": \"ccvv\"}" %server% olapmeta.OlapMetaService/GetCubeByName

grpcurl --plaintext --import-path "%proto_path%" --proto "%proto_file%" -d "{\"name\": \"Nile River Store\"}" %server% olapmeta.OlapMetaService/GetCubeByName
