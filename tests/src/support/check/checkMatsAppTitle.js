/**
 * Check the title (in the plottype element)
 * @param  {String}   title the selection parameter
 */
export default (title) => {
    const command = 'getText';

    /**
     * The expected text
     * @type {String}
     */
    const stringExpectedText = title;

    /**
     * The text of the element
     * @type {String}
     */
    const elem = $('#appTitleText');
    elem.waitForDisplayed();
    elem.scrollIntoView();
    const text = elem[command]();

    expect(text).toContain(stringExpectedText);
};
