/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 */

export default async (parameter) => {
    /**
     * The method to use for selecting the option
     * @type {String}
     */

    // noinspection JSJQueryEfficiency
    await $(`#controlButton-${parameter}`).waitForDisplayed();
    await $(`#controlButton-${parameter}`).scrollIntoView();
    await $(`#controlButton-${parameter}`).click();
    if (await $(`#${parameter}-select-clear`).isDisplayed()) {
        await $(`#${parameter}-select-clear`).waitForClickable();
        await $(`#${parameter}-select-clear`).click();
    }
    if (await $(`#${parameter}-select-all`).isDisplayed()) {
        await $(`#${parameter}-select-all`).waitForClickable();
        await $(`#${parameter}-select-all`).click();
    }
    if (await $(`#${parameter}-select-done`).isDisplayed()) {
        // if it is a multi-select selector, have to click the done button
        await $(`#${parameter}-select-done`).waitForClickable();
        await $(`#${parameter}-select-done`).click();
    }
};
