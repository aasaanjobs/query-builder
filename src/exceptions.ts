export class InvalidFilterFormat extends Error {
    constructor(m: any) {
        super(m)
    }
};

export class InvalidFilterConstraint extends Error {
    constructor(m: any) { super(m); }
}
