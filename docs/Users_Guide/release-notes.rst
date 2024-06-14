******************************
METexpress Release Information
******************************

METexpress Release Notes
========================

When applicable, release notes are followed by the GitHub issue number which describes the bugfix,
enhancement, or new feature (`METexpress GitHub issues <https://github.com/dtcenter/METexpress/issues>`_).
Important issues are listed **in bold** for emphasis.
     
METexpress Version 5.3.1 release notes (20240621)
-------------------------------------------------

  .. dropdown:: Repository, build, and test

     * None
     
  .. dropdown:: Documentation

     * None
     
  .. dropdown:: Bugfixes

     * Fixed bug that caused dates to spontaneously change when plot type was changed.
     * Fixed bug in data routines where some zeros were still being erroneously filtered out as if they were NaNs.
     
  .. dropdown:: Enhancements
  
     * Added RI CTC stat plotting to MET Cyclone app.

  .. dropdown:: Miscellaneous
    
     * Updated all apps to Meteor v2.16.
        
METexpress Upgrade Instructions
===============================

METexpress Version 5.3.1 upgrade instructions
---------------------------------------------

Download and deploy the new v5.3.1 docker containers from the dtcenter repository.
