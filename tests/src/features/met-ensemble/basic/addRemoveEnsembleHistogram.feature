Feature: Add Remove EnsembleHistogram

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the EnsembleHistogram radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-ensemble"
        Then I expect the app title to be "MET Ensemble"

    @watch
    Scenario: addRemoveEnsembleHistogram
        When I set the plot type to "EnsembleHistogram"
        Then the plot type should be "EnsembleHistogram"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsd_ensemble_test"
        Then the "database" parameter value matches "mv_gsd_ensemble_test"
        When I change the "data-source" parameter to "HREFv2_1"
        Then the "data-source" parameter value matches "HREFv2_1"
        When I change the "region" parameter to "CONUS"
        Then the "region" parameter value matches "CONUS"
        When I change the "variable" parameter to "TMP"
        Then the "variable" parameter value matches "TMP"
        When I change the "level" parameter to "Z2"
        Then the "level" parameter value matches "Z2"
        When I change the "histogram-type-controls" parameter to "Probability Integral Transform Histogram"
        Then the "histogram-type-controls" parameter value matches "Probability Integral Transform Histogram"
        When I set the curve-dates to "10/24/2019 00:00 - 12/24/2019 00:00"
        Then the curve-dates value is "10/24/2019 00:00 - 12/24/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
