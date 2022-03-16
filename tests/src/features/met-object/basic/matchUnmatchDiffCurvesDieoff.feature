Feature: Match Unmatch Diff Curves Dieoff

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are DieOff,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-object"
        Then I expect the app title to be "MET Objects"

    @watch
    Scenario: matchUnmatchDiffCurvesDieoff
        When I set the plot type to "DieOff"
        Then the plot type should be "DieOff"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsl_mode_retros"
        Then the "database" parameter value matches "mv_gsl_mode_retros"
        When I change the "data-source" parameter to "HRRRv3"
        Then the "data-source" parameter value matches "HRRRv3"
        When I change the "statistic" parameter to "OTS (Object Threat Score)"
        Then the "statistic" parameter value matches "OTS (Object Threat Score)"
        When I change the "variable" parameter to "REFC"
        Then the "variable" parameter value matches "REFC"
        When I set the curve-dates to "05/01/2020 0:00 - 05/08/2020 0:00"
        Then the curve-dates value is "05/01/2020 0:00 - 05/08/2020 0:00"
        When I change the "dieoff-type" parameter to "Dieoff for a specified UTC cycle init hour"
        Then the "dieoff-type" parameter value matches "Dieoff for a specified UTC cycle init hour"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRRv4"
        Then the "data-source" parameter value matches "HRRRv4"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "matching diffs" radio button
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "pairwise diffs" radio button
        Then the plot format should be "pairwise"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "DieOff" plot

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
