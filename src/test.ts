import Backend from "./index";

let filters = {
    and: {
        "candidate.id": {eq: "12345"},
        "stage": {eq: "J_A"},
        "modified": {between: ["2018-01-01", "2019-01-01"]}
    },
    or: {
        "candidate.id": {eq: "22222"},
        "status": {eq: "RJ"}
    }
};

console.log(JSON.stringify(Backend.queryBuilder.gen(filters)));