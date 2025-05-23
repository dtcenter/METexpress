/**
 * Check if the given element exists in the DOM one or more times
 * @param  {String}  selector  Element selector
 * @param  {Boolean} falseCase Check if the element (does not) exists
 * @param  {Number}  exactly   Check if the element exists exactly this number
 *                             of times
 */
export default async (selector, falseCase, exactly) => {
    /**
     * The number of elements found in the DOM
     * @type {Int}
     */
    const nrOfElements = await $$(selector);

    if (falseCase === true) {
        expect(nrOfElements).toHaveLength(
            0,
            `Element with selector "${selector}" should not exist on the page`
        );
    } else if (exactly) {
        expect(nrOfElements).toHaveLength(
            exactly,
            `Element with selector "${selector}" should exist exactly `
            + `${exactly} time(s)`
        );
    } else {
        expect(nrOfElements.length).toBeGreaterThanOrEqual(
            1,
            `Element with selector "${selector}" should exist on the page`
        );
    }
};
