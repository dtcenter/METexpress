Feature: Add Remove Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-precip"
        Then I expect the app title to be "MET Precipitation"

    @watch
    Scenario: addRemoveCurve
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "group" parameter to "NCEP_ylin"
        Then the "group" parameter value matches "NCEP_ylin"
        When I change the "database" parameter to "mv_ylin_pcp"
        Then the "database" parameter value matches "mv_ylin_pcp"
        When I change the "data-source" parameter to "CONUSNEST"
        Then the "data-source" parameter value matches "CONUSNEST"
        When I change the "region" parameter to "G218/APL"
        Then the "region" parameter value matches "G218/APL"
        When I change the "statistic" parameter to "CSI"
        Then the "statistic" parameter value matches "CSI"
        When I change the "variable" parameter to "APCP/03"
        Then the "variable" parameter value matches "APCP/03"
        When I set the dates to "10/10/2019 0:00 - 11/09/2019 0:00"
        Then the dates value is "10/10/2019 0:00 - 11/09/2019 0:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "TimeSeries" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
