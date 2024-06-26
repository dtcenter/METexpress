Feature: Add Remove Threshold Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the threshold radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-surface"
        Then I expect the app title to be "MET Surface"

    @watch
    Scenario: addRemoveThresholdCurve
        When I set the plot type to "Threshold"
        Then the plot type should be "Threshold"
        When I change the "group" parameter to "Test12"
        Then the "group" parameter value matches "Test12"
        When I change the "database" parameter to "mv_cmaq_g2o"
        Then the "database" parameter value matches "mv_cmaq_g2o"
        When I change the "data-source" parameter to "CMAQ5X/148"
        Then the "data-source" parameter value matches "CMAQ5X/148"
        When I change the "statistic" parameter to "CSI (Critical Success Index)"
        Then the "statistic" parameter value matches "CSI (Critical Success Index)"
        When I set the curve-dates to "04/01/2019 00:00 - 05/09/2019 00:00"
        Then the curve-dates value is "04/01/2019 00:00 - 05/09/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
