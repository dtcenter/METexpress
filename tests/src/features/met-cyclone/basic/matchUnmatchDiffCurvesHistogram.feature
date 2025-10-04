Feature: Match Unmatch Diff Curves Histogram

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are Histogram,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-cyclone"
        Then I expect the app title to be "MET Cyclone"

    @watch
    Scenario: matchUnmatchDiffCurvesHistogram
        When I set the plot type to "Histogram"
        Then the plot type should be "Histogram"
        When I change the "group" parameter to "realtime_tc_verif"
        Then the "group" parameter value matches "realtime_tc_verif"
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
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "statistic" parameter to "Cross track error (nm)"
        Then the "statistic" parameter value matches "Cross track error (nm)"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "Diff all curves against the 1st added curve"
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "Diff the 1st and 2nd curves, 3rd and 4th, etc"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "none"
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
