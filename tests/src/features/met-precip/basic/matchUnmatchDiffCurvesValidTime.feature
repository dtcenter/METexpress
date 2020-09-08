Feature: Match Unmatch Diff Curves Valid Time

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are ValidTime,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-precip"
        Then I expect the app title to be "MET Precipitation"

    @watch
    Scenario: matchUnmatchDiffCurvesValidTime
        When I set the plot type to "ValidTime"
        Then the plot type should be "ValidTime"
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
        When I set the curve-dates to "10/10/2019 0:00 - 11/09/2019 0:00"
        Then the curve-dates value is "10/10/2019 0:00 - 11/09/2019 0:00"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "FV3GFS"
        Then the "data-source" parameter value matches "FV3GFS"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "matching diffs" radio button
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "pairwise diffs" radio button
        Then the plot format should be "pairwise"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "ValidTime" plot

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
