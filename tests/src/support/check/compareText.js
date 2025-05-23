/**
 * Compare the contents of two elements with each other
 * @param  {String}   selector1  Element selector for the first element
 * @param  {String}   falseCase Whether to check if the contents of both
 *                              elements match or not
 * @param  {String}   selector2  Element selector for the second element
 */
export default async (selector1, falseCase, selector2) => {
    /**
     * The text of the first element
     * @type {String}
     */
    const text1 = await $(selector1).getText();

    /**
     * The text of the second element
     * @type {String}
     */
    const text2 = await $(selector2).getText();

    if (falseCase) {
        expect(text1).not.toEqual(
            text2,
            `Expected text not to be "${text1}"`
        );
    } else {
        expect(text1).toEqual(
            text2,
            `Expected text to be "${text1}" but found "${text2}"`
        );
    }
};
