Feature: Plot and Add buttons are disabled while plotting

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve
    and I want to attempt to add a second curve immediately.
    The app should disable the add button while it is adding the first curve

    Background:
        Given I load the app "/met-ensemble"
        Then I expect the app title to be "MET Ensemble"

    @watch
    Scenario: plotAddButtonsDisabledWhilePlotting
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsd_ensemble_test"
        Then the "database" parameter value matches "mv_gsd_ensemble_test"
        When I change the "data-source" parameter to "HREFv2_1"
        Then the "data-source" parameter value matches "HREFv2_1"
        When I change the "region" parameter to "CONUS"
        Then the "region" parameter value matches "CONUS"
        When I change the "variable" parameter to "REFC"
        Then the "variable" parameter value matches "REFC"
        When I change the "level" parameter to "L0"
        Then the "level" parameter value matches "L0"
        When I set the dates to "10/24/2019 00:00 - 12/24/2019 00:00"
        Then the dates value is "10/24/2019 00:00 - 12/24/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I click the "Plot Unmatched" button
        Then the "Add Curve" button should not be enabled
        And the "Plot Matched" button should not be enabled
        And the "Plot Unmatched" button should not be enabled
        Then I should be on the graph page
        #The button should be disabled so the second click should have no effect.
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible
        And the "Plot Matched" button should be visible
        And the "Add Curve" button should be visible
        And the "Add Curve" button should be enabled
        And the "Plot Matched" button should be enabled
        And the "Plot Unmatched" button should be enabled

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
