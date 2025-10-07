******************************
METexpress Release Information
******************************

METexpress Release Notes
========================

When applicable, release notes are followed by the GitHub issue number which describes the bugfix,
enhancement, or new feature (`METexpress GitHub issues <https://github.com/dtcenter/METexpress/issues>`_).
Important issues are listed **in bold** for emphasis.
     
METexpress Version 6.2.0 release notes (20251010)
-------------------------------------------------

  .. dropdown:: Repository, build, and test

     * None.
     
  .. dropdown:: Documentation

     * None.
     
  .. dropdown:: Bugfixes

     * Removed ability to save images as a PDF, as it was associated with a critical vulnerability.
     
  .. dropdown:: Enhancements
  
     * Updated all apps to Meteor v3.3.2.
     * Updated all Meteor and npm packages to latest versions.
     * Upgraded styles to use Bootstrap 5.
     * Updated Plotly to version 3.1.0.
     * Map plots now use maplibre instead of mapbox.
     * Switched selectors from select2 to bootstrap/uswds.

  .. dropdown:: Miscellaneous
    
     * METexpress Upper Air, Anomaly Correlation, and Surface default "truth" data-source is now ECMWF.
        
METexpress Upgrade Instructions
===============================

METexpress Version 6.2.0 upgrade instructions
---------------------------------------------

Download and deploy the new v6.2.0 docker containers from the dtcenter repository.
