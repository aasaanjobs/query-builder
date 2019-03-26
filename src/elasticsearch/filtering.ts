import { InvalidFilterFormat, InvalidFilterConstraint } from "../exceptions";

export class ElasticQueryBuilder {
    private operators: {[index: string]: string} = {
        and: "must",
        or: "should"
    }

    private handlers: { [index: string]: any } = {
        inq: this.inq,
        eq: this.eq,
        lte: this.lte,
        gte: this.gte,
        between: this.between,
    }

    private eq(field: string, value: string) {
        return { term: { [field]: value }};
    }

    private inq(field: string, value: Array<string>) {
        if (value.constructor !== Array) {
            throw new InvalidFilterFormat(`${field}: Expected array of values but received ${typeof value}`);
        }
        return { terms: { [field]: value }};
    }

    private lte(field: string, value: string) {
        return { range: { [field]: { lte: value } } }
    }

    private gte(field: string, value: string) {
        return { range: { [field]: { gte: value } } }
    }

    private between(field: string, value: Array<string>) {
        if (value.length !== 2) {
            throw new InvalidFilterFormat(`${field}: Between expects an array of format [<lowerBound>, <upperBound>]`)
        }
        return { range: { [field]: { gte: value[0], lte: value[1] } } }
    }

    /**
     * Checks whether the condition/field received is a boolean
     * filter operation or not, i.e., AND/OR/NOT.
     * @private
     * @param {string|object} condition
     * @returns {boolean} True if passed, else false
     * @memberof FilterBuilder
     */
    private isBooleanOp(condition: any): boolean {
        if (Object.keys(this.operators).indexOf(condition) !== -1) {
            return true;
        } else {
            return false;
        }
    }

    public gen(data: {[key: string]: any}, root?: any) {
        if (!data) { return []; }
        let queries: { [index: string]: any } = { bool: {} };
        if (data.constructor !== Object) {
            throw new InvalidFilterFormat(`Expected object received ${typeof data}`);
        }
        if (Object.keys(data).length > 2) {
            throw new InvalidFilterFormat("No more than 2 root conditions are supported");
        }
        for (let rootCondition of Object.keys(data)) {
            let subQueries: Array<any> = [];
            let filters = data[rootCondition];
            for (let field of Object.keys(filters)) {
                for (let constraint of Object.keys(filters[field])) {
                    if (!this.handlers[constraint]) {
                        throw new InvalidFilterConstraint(`Unsupported constraint ${constraint} provided`);
                    }
                    subQueries.push(this.handlers[constraint](field, filters[field][constraint]))
                }
            }
            queries.bool[this.operators[rootCondition]] = subQueries
        }
        return queries;
    }

}