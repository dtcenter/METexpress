/**
 * Check the curve has the correct color
 * @param  {String}  label of the curve
 * @param  {String}  color of the curve
 */

export default async (curve, color) => {
    const actualColor = await $(`#${curve}-color-value`).getValue();
    const expectedColor = color;
    expect(actualColor).toEqual(expectedColor,
        `expected color ${expectedColor} does not match actualColor ${actualColor}`);
};
