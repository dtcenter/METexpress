Feature: Add Remove DieOff Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the dieoff radio button,
    I want to set the forecast-length selector to dieoff
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-tc"
        Then I expect the app title to be "MET TC"

    @watch
    Scenario: addRemoveDieOffCurve
        When I set the plot type to "DieOff"
        Then the plot type should be "DieOff"
        When I change the "group" parameter to "vhagerty"
        Then the "group" parameter value matches "vhagerty"
        When I change the "database" parameter to "mv_testtc"
        Then the "database" parameter value matches "mv_testtc"
        When I change the "data-source" parameter to "AEMI"
        Then the "data-source" parameter value matches "AEMI"
        When I change the "basin" parameter to "AL"
        Then the "basin" parameter value matches "AL"
        When I change the "year" parameter to "2017"
        Then the "year" parameter value matches "2017"
        When I change the "storm" parameter to "AL112017 - IRMA"
        Then the "storm" parameter value matches "AL112017 - IRMA"
        When I change the "statistic" parameter to "Along track error (nm)"
        Then the "statistic" parameter value matches "Along track error (nm)"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
