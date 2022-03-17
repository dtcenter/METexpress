Feature: Match Unmatch Diff Curves Dieoff

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are DieOff,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-precip"
        Then I expect the app title to be "MET Precipitation"

    @watch
    Scenario: matchUnmatchDiffCurvesDieoff
        When I set the plot type to "DieOff"
        Then the plot type should be "DieOff"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_hwt_2018"
        Then the "database" parameter value matches "mv_hwt_2018"
        When I change the "data-source" parameter to "GFDLFV3"
        Then the "data-source" parameter value matches "GFDLFV3"
        When I change the "region" parameter to "FULL"
        Then the "region" parameter value matches "FULL"
        When I change the "statistic" parameter to "CSI (Critical Success Index)"
        Then the "statistic" parameter value matches "CSI (Critical Success Index)"
        When I change the "variable" parameter to "APCP_03"
        Then the "variable" parameter value matches "APCP_03"
        When I set the curve-dates to "02/03/2018 0:00 - 06/03/2019 0:00"
        Then the curve-dates value is "02/03/2018 0:00 - 06/03/2019 0:00"
        When I change the "dieoff-type" parameter to "Dieoff for a specified UTC cycle init hour"
        Then the "dieoff-type" parameter value matches "Dieoff for a specified UTC cycle init hour"
        When I change the "utc-cycle-start" parameter to "0"
        Then the "utc-cycle-start" parameter value matches "0"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR"
        Then the "data-source" parameter value matches "HRRR"
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
