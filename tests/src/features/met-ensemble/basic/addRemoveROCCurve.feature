Feature: Add Remove ROC Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the ROC radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-ensemble"
        Then I expect the app title to be "MET Ensemble"

    @watch
    Scenario: addRemoveROCCurve
        When I set the plot type to "ROC"
        Then the plot type should be "ROC"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsd_ensemble_test"
        Then the "database" parameter value matches "mv_gsd_ensemble_test"
        When I change the "data-source" parameter to "HREF"
        Then the "data-source" parameter value matches "HREF"
        When I change the "region" parameter to "CONUS"
        Then the "region" parameter value matches "CONUS"
        When I change the "variable" parameter to "PROB(APCP_06>25_400)"
        Then the "variable" parameter value matches "PROB(APCP_06>25_400)"
        When I change the "level" parameter to "A06"
        Then the "level" parameter value matches "A06"
        When I set the curve-dates to "10/24/2019 0:00 - 12/24/2019 0:00"
        Then the curve-dates value is "10/24/2019 0:00 - 12/24/2019 0:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "ROC" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
