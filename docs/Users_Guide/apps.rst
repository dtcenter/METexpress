.. _apps:

Apps
====
3.	METexpress Apps

This section includes a description of the unique feature of each app.
3.1.	Upper Air App

The user interface for Upper Air follows the general description from above.  Choices specific to this app are shown below.

Choices for Statistic:
•	RMSE
•	Bias-corrected RMSE
•	MSE
•	Bias-corrected MSE
•	ME (Additive bias)
•	Multiplicative bias
•	Forecast mean
•	Observed mean
•	Forecast stdev
•	Observed stdev
•	Error stdev
•	Pearson Correlation
The Upper Air app includes functionality for these types of plots:
•	Time Series
•	Profile
•	Dieoff
•	ValidTime
•	Histogram
•	Contour

The Upper Air app includes the following plot types.
Time Series: The default plot type is Time Series, which has date on the x-axis and the mean value of the selected parameter for that date on the y-axis.
Profile: The Profile plot type displays pressure level on the y–axis and the mean value of the selected parameter on the x-axis.  
Die-off: Die-off plots show how skill (or the inverse, error) changes with increasing lead time.  Figure 3.1 1 shows the user interface page after selecting the plot type of DieOff.  Note that another selector is included for DIEOFF TYPE, which has the following possible values:
1.	Dieoff
2.	Dieoff for a specific UTC cycle start time
3.	Single cycle forecast

 
Figure 3.1 1 User Interface screen after selecting plot type of DieOff.
Figure 3.1 2 shows a sample of a DieOff plot in METexpress.  This looks more like a familiar die-off curve when plotting skill, such as anomaly correlation as plotted in Figure 3.1 3 using the Anomaly Correlation app, rather than error as is plotted with the Upper Air app.  
The option “dieoff” for Dieoff Type uses all data at each given forecast hour within the specified date range.  The option for “Dieoff for a specific UTC cycle start time” filters data to only use those at a specified cycle initialization time, such as 0 or 12.  The option “Single cycle forecast” uses only the forecasts from the first cycle in the specified date range.


 
Figure 3.1 2 Upper Air DieOff plot

 
Figure 3.1 3 Anomaly Correlation DieOff plot
ValidTime: The ValidTime plot type (also sometimes known as diurnal cycle plots) displays valid UTC hour on the x–axis and the mean value of the selected parameter on the y-axis. 
Histograms: Histograms allow users to visualize the distribution of a given statistic over a specified time period. For example, if a user requested a histogram of RMSE for 144-h GFS forecasts over the global domain for a month, they would see the frequencies of specific RMSE values produced by individual GFS runs over that month. Histograms have statistical value bins on the x-axis, and number or frequency counts on the y-axis.  
Histograms have a number of additional selectors that control their appearance:
•	Y-axis mode: Can be set to either “Relative frequency” or “Number”, depending on whether a user wants the frequency of a given statistic displayed as a fraction of 100, or as a raw count.
•	Customize bins: With this selector, the user can choose one of the following options to customize their x-axis bins:
o	Default bins
o	Set number of bins
	Has sub-selector “Number of bins”
o	Make zero a bin bound
o	Choose a bin bound
	Has sub-selector “Bin pivot value”
o	Set number of bins and make zero a bin bound
	Has sub-selector “Number of bins”
o	Set number of bins and choose a bin bound
	Has sub-selectors “Number of bins” and “Bin pivot value”
o	Manual bins
	Has sub-selector “Bin bounds”
o	Manual start, number, and stride
	Has sub-selectors “Number of bins”, “Bin start”, and “Bin stride”
Figure 3.1 4 shows the user interface for histogram plots and Figure 3.1 5 shows a sample plot.
 
Figure 3.1 4 The user interface for histogram plots.

 
Figure 3.1 5 Plot generated from selections in Figure 3.1 4
Contour: Contour plots can be used in many ways.  One can illustrate data with respect to height, as in plots seen at http://www.emc.ncep.noaa.gov/gmb/STATS_vsdb/, which have height on the y-axis and forecast hour (as in lead time) on the x-axis.  These VSDB stat plots can be easily replicated in METexpress by using the contour plot type, except that the plot in METexpress will have only one pane, not two. In addition, METexpress users are not bound to have only pressure level / height on the y-axis or forecast lead time on the x-axis. They can reverse the two, place valid or init UTC hour on one of the axes, create Hovmoller diagrams, and many other combinations.
Contour plots have two additional selectors, x-axis-parameter and y-axis-parameter. With these, a user can decide which field to place on the x-axis (e.g. forecast lead time), and which to place on the y-axis (e.g. pressure level or valid UTC hour).
Figure 3.1 6 shows an example of an Upper Air profile plotted as a contour plot.

 
Figure 3.1 6 Upper Air profile, as a contour plot
3.2.	 Anomaly Correlation App

An example of the Anomaly Correlation app user interface is shown in Figure 3.2 1.  This interface is similar to the one for Upper Air but has fewer selectable parameters.  
 
Figure 3.2 1 Anomaly Correlation app user interface
In this application, the selectable values are derived from the data for these parameters:
•	Group
•	Database
•	Data-Source
•	Region
•	Variable
•	Forecast lead time
•	Level
•	Description
•	Dates
•	Curve-dates

METexpress Anomaly Correlation does not have a Statistic selector, as it displays anomaly correlation as its only statistic.

Plot types available include 
•	Time Series
•	Profile
•	DieOff
•	ValidTime
•	Histogram
•	Contour
All plot types function the same here as they do in MET Upper Air described above.
A sample anomaly correlation plot is shown in Figure 3.2 2.

 
Figure 3.2 2 Anomaly Correlation sample plot.
 
3.3.	Surface App

The user interface for the Surface app is shown in Figure 3.3 1.  

 
Figure 3.3 1 User Interface for the Surface app

For this app, the following parameters have choices derived from the data.
•	Group
•	Database
•	Data-source
•	Region
•	Variable
•	Forecast lead time
•	Ground level
•	Description
•	Dates
•	Curve-dates

The selector for the Statistic has these possible choices:
•	RMSE
•	Bias-corrected RMSE
•	MSE
•	Bias-corrected MSE
•	ME (Additive bias)
•	Multiplicative bias
•	Forecast mean
•	Observed mean
•	Forecast stdev
•	Observed stdev
•	Error stdev
•	Pearson Correlation
Plot types available include:
•	Time Series
•	DieOff
•	ValidTime
•	Histogram
•	Contour
Plots in the Surface app for Time Series, DieOff, ValidTime, Histogram, and Contour are the same as in Upper Air. An example of a Valid Time plot is shown in Figure 3.3 2.

 
Figure 3.3 2 Surface app ValidTime plot
 
3.4.	  Air Quality App

For this app, the following parameters have choices derived from the data.
•	Group
•	Database
•	Data-source
•	Region
•	Variable
•	Threshold
•	Forecast lead time
•	Ground level
•	Description
•	Dates
•	Curve-dates

The selector for the Statistic has these possible choices:
•	CSI
•	FAR
•	FBIAS
•	GSS
•	HSS
•	PODy
•	PODn
•	POFD
•	RMSE
•	Bias-corrected RMSE
•	MSE
•	Bias-corrected MSE
•	ME (Additive bias)
•	Multiplicative bias
•	Forecast mean
•	Observed mean
•	Forecast stdev
•	Observed stdev
•	Error stdev
•	Pearson Correlation
Plot types available include 
•	Time Series
•	DieOff
•	Threshold
•	ValidTime
•	Histogram
•	Contour
Plots in the Air Quality app for Time Series, DieOff, ValidTime, Histogram, and Contour are the same as in Upper Air. 
An additional plot type, Threshold, is available in this app. Threshold plots display threshold on the x-axis, and the mean value of the selected parameter on the y-axis.  
Figure 3.4 1 shows an example of an Air Quality Threshold plot. 

 
Figure 3.4 1 Air Quality app Threshold plot
 
3.5.	 Ensemble App

For this app, the following parameters have choices derived from the data.
•	Group
•	Database
•	Data-source
•	Region
•	Statistic
•	Variable
•	Forecast lead time
•	Level
•	Description
•	Dates
•	Curve-dates

Unlike in the other apps, statistics for MET Ensemble are not static, but depend on the MET line types loaded into the database. Available statistics can include:
•	RMSE
•	RMSE with obs error
•	Spread
•	Spread with obs error
•	ME (Additive bias)
•	ME with obs error
•	CRPS
•	CRPSS
•	MAE
•	ACC
•	BS
•	BSS
•	BS reliability
•	BS resolution
•	BS uncertainty
•	BS lower confidence limit
•	BS upper confidence limit
•	ROC AUC
•	EV
•	FSS
Plot types available include 
•	Time Series
•	DieOff
•	ValidTime
•	Histogram
•	Ensemble Histogram
•	Reliability
•	ROC
Plots in the Ensemble app for Time Series, DieOff, ValidTime, and Histogram are the same as in Upper Air. 
Three plot types are specific to this app: Ensemble Histogram, Reliability, and ROC. 
Ensemble Histograms are controlled by the Histogram type selector that appears at the bottom of the main app page when the plot type of Ensemble Histogram is selected.  This can be set to Rank Histogram, Probability Integral Transform Histogram, or Relative Position Histogram. Selecting one of these will produce the corresponding plot, with bins pre-calculated in the MET verification process. As with regular histogram plots, the user has the option of setting the Y-axis mode to either “Relative frequency” or “Number”.
Reliability plots produce a single curve for the chosen parameters (probabilistic variables only), with Forecast Probability on the x-axis, and Observed Relative Frequency on the y-axis. Four additional lines will be displayed on the graph, denoting perfect skill, no skill, x climatology, and y climatology.
ROC plots can display multiple curves (probabilistic variables only), with False Alarm Rate on the x-axis, and Probability of Detection on the y-axis. An additional diagonal line will be displayed on the graph, denoting no skill.
Figure 3.5 1 shows the user interface for defining an Ensemble Histogram and Figure 3.5 2 through Figure 3.5 4 show examples of the 3 types of Ensemble Histograms.
  
Figure 3.5 1 The Ensemble app user interface for Ensemble Histogram plots.  Note the selector for Histogram Type which is unique to this plot type.
 
Figure 3.5 2 Ensemble Histogram plot type with Histogram Type of Rank Histogram.

 
Figure 3.5 3 Ensemble Histogram plot type with Histogram Type of Probability Integral Transform Histogram.
 
Figure 3.5 4 Ensemble Histogram plot type with Histogram Type of Relative Position Histogram

Figure 3.5 5 shows an example Reliability plot and Figure 3.5 6 shows an example ROC plot, both for the same data set.
 
Figure 3.5 5 Ensemble App Reliability Plot for data defined in Figure 3.5 1 .  The 1:1 diagonal gray line represents perfect skill between forecast probability and observation frequency. The diagonal line with the lower slope indicates the point above which the forecast becomes more skillful than climatology, and the vertical and horizontal lines indicate climatology.

 
Figure 3.5 6 Ensemble app ROC plot for the same data set defined in Figure 3.5-1.
3.6.	Precipitation App

For this app, the following parameters have choices derived from the data.
•	Group
•	Database
•	Data-source
•	Region
•	Variable
•	Threshold
•	Scale
•	Obs type
•	Forecast lead time
•	Level
•	Description
•	Dates
•	Curve-dates

The selector for the Statistic has these possible choices:
•	CSI
•	FAR
•	FBIAS
•	GSS
•	HSS
•	PODy
•	PODn
•	POFD
•	FSS
•	RMSE
•	Bias-corrected RMSE
•	MSE
•	Bias-corrected MSE
•	ME (Additive bias)
•	Multiplicative bias
•	Forecast mean
•	Observed mean
•	Forecast stdev
•	Observed stdev
•	Error stdev
•	Pearson Correlation
Plot types available include 
•	Time Series
•	DieOff
•	Threshold
•	ValidTime
•	GridScale
•	Histogram
•	Contour
Plots in the Precipitation app for Time Series, DieOff, ValidTime, Histogram, and Contour are the same as in Upper Air. 
A different plot type, Threshold, is present in this app. Threshold plots display threshold on the x-axis, and the mean value of the selected parameter on the y-axis.
Another unique plot type, GridScale, is included in this app. GridScale plots display grid scale on the x-axis, and the mean value of the selected parameter on the y-axis.
Figure 3.6 1 shows an example of the user interface for the Precipitation app, Figure 3.6 2 shows an example Threshold plot, and Figure 3.6 3 shows an example GridScale plot.

 
Figure 3.6 1 User interface screen for a Threshold plot in the Precipitation app



 
Figure 3.6 2 Threshold plot in the Precipitation app produced from selections in Figure 3.6-1

  
Figure 3.6 3 GridScale plot in the Precipitation app produced from selections in Figure 3.6-1
 


