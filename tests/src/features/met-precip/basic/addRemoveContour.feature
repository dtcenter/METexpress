Feature: Add Remove Contour

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the contour radio button,
    I want to add one curve.
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/met-precip"
        Then I expect the app title to be "MET Precipitation"

    @watch
    Scenario: addRemoveContour
        When I set the plot type to "Contour"
        Then the plot type should be "Contour"
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
        When I set the dates to "02/03/2018 00:00 - 06/03/2019 00:00"
        Then the dates value is "02/03/2018 00:00 - 06/03/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Contour" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
