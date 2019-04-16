import { InvalidFilterFormat, InvalidFilterConstraint } from "../exceptions";

/**
 * 
 *
 * @export
 * @class ElasticQueryBuilder Class to convert basic queries to elasticsearch queries
 */
export class ElasticQueryBuilder {
    private operators: {[index: string]: string} = {
        and: "must",
        or: "should"
    }

    private handlers: { [index: string]: any } = {
        inq: this.inq,
        eq: this.eq,
        lt: this.lt,
        lte: this.lte,
        gt: this.gt,
        gte: this.gte,
        between: this.between,
        neq: this.neq,
        nested: this.nested
    }

    private eq(field: string, value: string) {
        return { term: { [field]: value }};
    }

    private neq(field: string, value: string) {
        return this.eq(field, value);
    }

    private inq(field: string, value: Array<string>) {
        if (value.constructor !== Array) {
            throw new InvalidFilterFormat(`${field}: Expected array of values but received ${typeof value}`);
        }
        return { terms: { [field]: value }};
    }

    private lt (field: string, value: string) {
        return { range: { [field]: { lt: value } } }
    }

    private lte(field: string, value: string) {
        return { range: { [field]: { lte: value } } }
    }

    private gt (field: string, value: string) {
        return { range: { [field]: { gt: value } } }
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

    private nested(field: string, nestedFields: {[key: string]: any}) {
        let mustList: Array<any> = [];
        Object.keys(nestedFields).forEach(subField => {
            const constraints = nestedFields[subField];
            Object.keys(constraints).forEach(key => {
                const handler = (this as any)[key];
                mustList.push(handler([field, subField].join('.'), constraints[key]));
            });
        });
        return {
            nested: {
                path: field,
                query: { bool: { must: mustList }}
            }
        };
    }

    private and(data: {[key: string]: any}) {

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