Feature: Plot and Add buttons are disabled while plotting

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve
    and I want to attempt to add a second curve immediately.
    The app should disable the add button while it is adding the first curve

    Background:
        Given I load the app "/met-cyclone"
        Then I expect the app title to be "MET Cyclone"

    @watch
    Scenario: plotAddButtonsDisabledWhilePlotting
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "database" parameter to "gopa01"
        Then the "database" parameter value matches "gopa01"
        When I change the "data-source" parameter to "GFSO: GFS"
        Then the "data-source" parameter value matches "GFSO: GFS"
        When I change the "basin" parameter to "AL"
        Then the "basin" parameter value matches "AL"
        When I change the "year" parameter to "2024"
        Then the "year" parameter value matches "2024"
        When I change the "storm" parameter to "AL142024-MILTON"
        Then the "storm" parameter value matches "AL142024-MILTON"
        When I change the "statistic" parameter to "Along track error (nm)"
        Then the "statistic" parameter value matches "Along track error (nm)"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I click the "Plot Unmatched" button
        Then the "Add Curve" button should not be enabled
        And the "Plot Matched" button should not be enabled
        And the "Plot Unmatched" button should not be enabled
        Then I should be on the graph page
        #The button should be disabled so the second click should have no effect.
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible
        And the "Plot Matched" button should be visible
        And the "Add Curve" button should be visible
        And the "Add Curve" button should be enabled
        And the "Plot Matched" button should be enabled
        And the "Plot Unmatched" button should be enabled

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
