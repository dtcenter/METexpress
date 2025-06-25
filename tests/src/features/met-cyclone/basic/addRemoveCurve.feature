Feature: Add Remove Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-cyclone"
        Then I expect the app title to be "MET Cyclone"

    @watch
    Scenario: addRemoveCurve
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_nhc_tcmet_post"
        Then the "database" parameter value matches "mv_nhc_tcmet_post"
        When I change the "data-source" parameter to "GFSO: GFS"
        Then the "data-source" parameter value matches "GFSO: GFS"
        When I change the "basin" parameter to "AL"
        Then the "basin" parameter value matches "AL"
        When I change the "year" parameter to "2024"
        Then the "year" parameter value matches "2024"
        When I change the "storm" parameter to "AL142024 - MILTON"
        Then the "storm" parameter value matches "AL142024 - MILTON"
        When I change the "statistic" parameter to "Along track error (nm)"
        Then the "statistic" parameter value matches "Along track error (nm)"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
