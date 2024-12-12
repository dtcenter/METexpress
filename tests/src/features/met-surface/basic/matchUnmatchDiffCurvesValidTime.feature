Feature: Match Unmatch Diff Curves Valid Time

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are ValidTime,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-surface"
        Then I expect the app title to be "MET Surface"

    @watch
    Scenario: matchUnmatchDiffCurvesValidTime
        When I set the plot type to "ValidTime"
        Then the plot type should be "ValidTime"
        When I change the "group" parameter to "NOAA NCEP"
        Then the "group" parameter value matches "NOAA NCEP"
        When I change the "database" parameter to "mv_ncep_meso_sl1l2"
        Then the "database" parameter value matches "mv_ncep_meso_sl1l2"
        When I change the "data-source" parameter to "GFS/212"
        Then the "data-source" parameter value matches "GFS/212"
        When I set the curve-dates to "10/01/2014 00:00 - 11/09/2014 00:00"
        Then the curve-dates value is "10/01/2014 00:00 - 11/09/2014 00:00"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR/255"
        Then the "data-source" parameter value matches "HRRR/255"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff all curves against the 1st added curve"
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff the 1st and 2nd curves, 3rd and 4th, etc"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "none"
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
