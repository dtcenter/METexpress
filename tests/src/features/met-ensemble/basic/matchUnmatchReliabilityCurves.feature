Feature: Match Unmatch Reliability Curves

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are Reliability,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/met-ensemble"
        Then I expect the app title to be "MET Ensemble"

    @watch
    Scenario: matchUnmatchReliabilityCurves
        When I set the plot type to "Reliability"
        Then the plot type should be "Reliability"

        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsd_ensemble_test"
        Then the "database" parameter value matches "mv_gsd_ensemble_test"
        When I change the "data-source" parameter to "HREF"
        Then the "data-source" parameter value matches "HREF"
        When I change the "region" parameter to "CONUS"
        Then the "region" parameter value matches "CONUS"
        When I change the "variable" parameter to "PROB(APCP_06>25_400)"
        Then the "variable" parameter value matches "PROB(APCP_06>25_400)"
        When I change the "level" parameter to "A06"
        Then the "level" parameter value matches "A06"
        When I set the curve-dates to "10/24/2019 00:00 - 12/24/2019 00:00"
        Then the curve-dates value is "10/24/2019 00:00 - 12/24/2019 00:00"

        When I click the "Add Curve" button
        Then "Curve0" is added
        When I change the "variable" parameter to "PROB(APCP_06>50_800)"
        Then the "variable" parameter value matches "PROB(APCP_06>50_800)"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Reliability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Reliability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
