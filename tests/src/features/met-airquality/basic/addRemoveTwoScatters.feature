Feature: Add Remove Two Scatters

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    I want to change the data-source to HRRR_GSL
    I want to add one other curve
    then plot unmatched and see the graph,
    then go back to the curve management page,
    then remove all curves.
    I should have no curves.

    Background:
        Given I load the app "/met-surface"
        Then I expect the app title to be "MET Surface"

    @watch
    Scenario: addRemoveTwoScatters
        When I set the plot type to "SimpleScatter"
        Then the plot type should be "SimpleScatter"
        When I change the "group" parameter to "Test12"
        Then the "group" parameter value matches "Test12"
        When I change the "database" parameter to "mv_cmaq_g2o"
        Then the "database" parameter value matches "mv_cmaq_g2o"
        When I change the "data-source" parameter to "CMAQ5X/148"
        Then the "data-source" parameter value matches "CMAQ5X/148"
        When I change the "statistic" parameter to "RMSE"
        Then the "statistic" parameter value matches "RMSE"
        When I change the "variable" parameter to "OZMX/8"
        Then the "variable" parameter value matches "OZMX/8"
        When I change the "y-statistic" parameter to "RMSE"
        Then the "y-statistic" parameter value matches "RMSE"
        When I change the "y-variable" parameter to "OZMX/1"
        Then the "y-variable" parameter value matches "OZMX/1"
        When I set the curve-dates to "04/01/2019 00:00 - 05/09/2019 00:00"
        Then the curve-dates value is "04/01/2019 00:00 - 05/09/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "CMAQPARA11/148"
        Then the "data-source" parameter value matches "CMAQPARA11/148"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Simple Scatter" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Simple Scatter" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
