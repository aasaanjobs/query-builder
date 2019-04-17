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
        nested: this.nested,
        nested_not: this.nestedNot,
        exists: this.exists,
        missing: this.missing
    }

    private negativeConstraints: Array<string> = [
        'neq', 'nin', 'nested_not', 'missing'
    ]

    private nestedBool(filters: { [key:string]: any }) {
        let subQuery: {[key:string]: any} = { bool: {} };
        if (filters.and) {
            Object.assign(subQuery.bool, this.and(filters.and));
        }
        if (filters.or) {
            Object.assign(subQuery.bool, this.or(filters.or));
        }
        return subQuery;
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

    private exists(field: string, value: boolean | string) {
        if (value || value === 'true') {
            return { exists: { field: field } };
        } else {
            return {
                bool: { must_not: { exists: { field: field } } }
            }
        }
    }

    private missing(field: string, value: boolean | string) {
        if (value || value == 'true') {
            return this.exists(field, false);
        } else {
            return this.exists(field, true);
        }
    }

    private nested(field: string, nestedFields: {[key: string]: any}) {
        let mustList: Array<any> = [];
        Object.keys(nestedFields).forEach(subField => {
            const constraints = nestedFields[subField];
            Object.keys(constraints).forEach(key => {
                const handler = this.handlers[key];
                mustList.push(handler.call(this, [field, subField].join('.'), constraints[key]));
            });
        });
        return {
            nested: {
                path: field,
                query: { bool: { must: mustList }}
            }
        };
    }

    private nestedNot(field: string, nestedFields: {[key: string]: any}) {
        return this.nested(field, nestedFields);
    }

    protected and(filters: {[key: string]: any}) {
        let mustQueries: Array<any> = [];
        let mustNotQueries: Array<any> = [];
        Object.keys(filters).forEach(field => {
            const subFilter = filters[field];
            if (field.startsWith('nested_bool')) {
                mustQueries.push(this.nestedBool(subFilter));
            } else {
                Object.keys(subFilter).forEach(constraint => {
                    if (!this.handlers[constraint]) {
                        throw new InvalidFilterConstraint(`Unsupported constraint ${constraint} provided`);
                    }
                    const handler = this.handlers[constraint];
                    const _ = handler.call(this, field, subFilter[constraint]);
                    if (this.negativeConstraints.indexOf(constraint) !== -1) {
                        mustNotQueries.push(_);
                    } else {
                        mustQueries.push(_);
                    }                
                })
            }
        })
        return { must: mustQueries, must_not: mustNotQueries };
    }

    protected or(filters: {[key: string]: any}) {
        let shouldQueries: Array<any> = [];
        Object.keys(filters).forEach(field => {
            const subFilter = filters[field];
            if (field.startsWith('nested_bool')) {
                shouldQueries.push(this.nestedBool(subFilter));
            } else {
                Object.keys(subFilter).forEach(constraint => {
                    if (!this.handlers[constraint]) {
                        throw new InvalidFilterConstraint(`Unsupported constraint ${constraint} provided`);
                    }
                    const handler = this.handlers[constraint];
                    const _ = handler.call(this, field, subFilter[constraint]);
                    if (this.negativeConstraints.indexOf(constraint) !== -1) {
                        shouldQueries.push({ bool: { must_not: _ } });
                    } else {
                        shouldQueries.push(_);
                    }
                })
            }
        })
        return { should: shouldQueries };
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
        // Handle `and` operator
        if (data.and) {
            Object.assign(queries.bool, this.and(data.and));
        }
        // Handle `or` operator
        if (data.or) {
            Object.assign(queries.bool, this.or(data.or));
        }
        // for (let rootCondition of Object.keys(data)) {
        //     let subQueries: Array<any> = [];
        //     let filters = data[rootCondition];
        //     for (let field of Object.keys(filters)) {
        //         for (let constraint of Object.keys(filters[field])) {
        //             if (!this.handlers[constraint]) {
        //                 throw new InvalidFilterConstraint(`Unsupported constraint ${constraint} provided`);
        //             }
        //             subQueries.push(this.handlers[constraint](field, filters[field][constraint]))
        //         }
        //     }
        //     queries.bool[this.operators[rootCondition]] = subQueries
        // }
        return queries;
    }

}