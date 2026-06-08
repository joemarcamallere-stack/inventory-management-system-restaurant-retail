"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFutureDate = IsFutureDate;
const class_validator_1 = require("class-validator");
function IsFutureDate(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isFutureDate',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value) {
                    if (value === undefined || value === null)
                        return true;
                    const date = new Date(value);
                    return !isNaN(date.getTime()) && date > new Date();
                },
                defaultMessage(args) {
                    return `${args.property} must be a future date`;
                },
            },
        });
    };
}
//# sourceMappingURL=is-future-date.validator.js.map