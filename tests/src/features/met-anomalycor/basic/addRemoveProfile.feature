Feature: Add Remove Profile

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one profile
    then plot that profile and see the graph,
    then go back to the profile management page,
    then delete that profile.

    Background:
        Given I load the app "/met-anomalycor"
        Then I expect the app title to be "MET Anomaly Correlation"

    @watch
    Scenario: addRemoveProfile
        When I set the plot type to "Profile"
        Then the plot type should be "Profile"
        When I change the "group" parameter to "vhagerty"
        Then the "group" parameter value matches "vhagerty"
        When I change the "database" parameter to "mv_gsd"
        Then the "database" parameter value matches "mv_gsd"
        When I change the "data-source" parameter to "GFS"
        Then the "data-source" parameter value matches "GFS"
        When I change the "forecast-length" parameter to "120"
        Then the "forecast-length" parameter value matches "120"
        When I set the curve-dates to "11/01/2018 00:00 - 11/11/2018 00:00"
        Then the curve-dates value is "11/01/2018 00:00 - 11/11/2018 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
