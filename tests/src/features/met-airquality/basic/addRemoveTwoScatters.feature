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
        When I change the "group" parameter to "NOAA NCEP"
        Then the "group" parameter value matches "NOAA NCEP"
        When I change the "database" parameter to "mv_ncep_meso_sl1l2"
        Then the "database" parameter value matches "mv_ncep_meso_sl1l2"
        When I change the "data-source" parameter to "GFS/212"
        Then the "data-source" parameter value matches "GFS/212"
        When I change the "statistic" parameter to "RMSE"
        Then the "statistic" parameter value matches "RMSE"
        When I change the "variable" parameter to "U"
        Then the "variable" parameter value matches "U"
        When I change the "y-statistic" parameter to "RMSE"
        Then the "y-statistic" parameter value matches "RMSE"
        When I change the "y-variable" parameter to "V"
        Then the "y-variable" parameter value matches "V"
        When I set the curve-dates to "10/01/2014 00:00 - 11/09/2014 00:00"
        Then the curve-dates value is "10/01/2014 00:00 - 11/09/2014 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR/255"
        Then the "data-source" parameter value matches "HRRR/255"
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

        When I click the "no diffs" radio button
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
