Feature: Match Unmatch Diff Curves Year To Year

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are YearToYear,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-cyclone"
        Then I expect the app title to be "MET Cyclone"

    @watch
    Scenario: matchUnmatchDiffCurvesYearToYear
        When I set the plot type to "YearToYear"
        Then the plot type should be "YearToYear"
        When I change the "group" parameter to "vhagerty"
        Then the "group" parameter value matches "vhagerty"
        When I change the "database" parameter to "mv_testtc"
        Then the "database" parameter value matches "mv_testtc"
        When I change the "data-source" parameter to "AEMI: GFS Ensemble Mean"
        Then the "data-source" parameter value matches "AEMI: GFS Ensemble Mean"
        When I change the "basin" parameter to "AL"
        Then the "basin" parameter value matches "AL"
        When I change the "statistic" parameter to "Track error (nm)"
        Then the "statistic" parameter value matches "Track error (nm)"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "basin" parameter to "EP"
        Then the "basin" parameter value matches "EP"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "matching diffs" radio button
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "pairwise diffs" radio button
        Then the plot format should be "pairwise"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Year To Year" plot

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
