import { ElasticQueryBuilder } from "./elasticsearch/filtering";

namespace Backend {
    export const queryBuilder = new ElasticQueryBuilder()
}

export default Backend;
