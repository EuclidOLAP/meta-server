const OlapEntityType = {
    DIMENSION: 1,
    HIERARCHY: 2,
    MEMBER: 3,
    LEVEL: 4,
    CUBE: 5,
    DIMENSION_ROLE: 6,
    FORMULA_MEMBER: 7,
    UNKNOWN: 0
};

function getOlapEntityTypeByGid(gid) {

    const quotient = Math.floor(gid / 100000000000000);

    if (quotient >= OlapEntityType.DIMENSION && quotient <= OlapEntityType.FORMULA_MEMBER)
        return quotient;

    return OlapEntityType.UNKNOWN;
}

module.exports = {
    OlapEntityType,
    getOlapEntityTypeByGid,
};