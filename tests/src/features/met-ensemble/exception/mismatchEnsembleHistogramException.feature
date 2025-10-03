Feature: Mismatch EnsembleHistogram Exception

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are EnsembleHistogram,
    I want to add two curves
    and I click plot matched
    then see "Can't plot matched with these curves because they don't have the same bins" in the info dialog
    then click the "Clear" button
    then the info dialog is not visible
    and the plot buttons and add curve buttons are enabled.

    Background:
        Given I load the app "/met-ensemble"
        Then I expect the app title to be "MET Ensemble"

    @watch
    Scenario: mismatchEnsembleHistogramException
        When I set the plot type to "EnsembleHistogram"
        Then the plot type should be "EnsembleHistogram"
        When I change the "group" parameter to "NO GROUP"
        Then the "group" parameter value matches "NO GROUP"
        When I change the "database" parameter to "mv_gsd_ensemble_test"
        Then the "database" parameter value matches "mv_gsd_ensemble_test"
        When I change the "data-source" parameter to "HREFv2_1"
        Then the "data-source" parameter value matches "HREFv2_1"
        When I change the "region" parameter to "CONUS"
        Then the "region" parameter value matches "CONUS"
        When I change the "variable" parameter to "REFC"
        Then the "variable" parameter value matches "REFC"
        Then I change the "forecast-length" parameter to "6"
        Then the "forecast-length" parameter value matches "6"
        When I change the "level" parameter to "L0"
        Then the "level" parameter value matches "L0"
        When I change the "histogram-type-controls" parameter to "Relative Position Histogram"
        Then the "histogram-type-controls" parameter value matches "Relative Position Histogram"
        When I set the curve-dates to "10/24/2019 00:00 - 12/24/2019 00:00"
        Then the curve-dates value is "10/24/2019 00:00 - 12/24/2019 00:00"
        When I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I change the "data-source" parameter to "HRRRE"
        Then the "data-source" parameter value matches "HRRRE"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Matched" button
        Then the "info" dialog should be visible
        And I should see "INFO:  Can't plot matched with these curves because they don't have the same bins. Try setting the histogram type to 'Probability Integral Transform Histogram'." in the "info" dialog

        # When I click the "Clear" button
        # Then the "info" dialog should not be visible
        # Then I should be on the main page
        # And the "Plot Matched" button should be visible

        # When I click the "Remove All" button
        # And the "Remove all the curves" button should be visible
        # Then I click the "Remove all the curves" button
        # Then I should have 0 curves
