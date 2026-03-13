******************************
METexpress Release Information
******************************

METexpress Release Notes
========================

When applicable, release notes are followed by the GitHub issue number which describes the bugfix,
enhancement, or new feature (`METexpress GitHub issues <https://github.com/dtcenter/METexpress/issues>`_).
Important issues are listed **in bold** for emphasis.
     
METexpress Version 6.2.6 release notes (20260313)
-------------------------------------------------

  .. dropdown:: Repository, build, and test

     * None.
     
  .. dropdown:: Documentation

     * Added documentation link to top navigation bar.
     
  .. dropdown:: Bugfixes

     * Fixed npm security vulnerability.
     * Clicking Restore Settings no longer removes all added curves unless the user then clicks confirm.
     * Clicking Restore Settings no longer changes the values on the blue curve selector buttons (although it may by necessity change plot type).
     * Fixed bug where the default legend text wouldn't appear on the Edit Legend modal.

     
  .. dropdown:: Enhancements
  
     * Reordered curve legends to be more concise and display forecast lead time earlier.
     * Made modals larger.

  .. dropdown:: Miscellaneous
    
     * None.
        
METexpress Upgrade Instructions
===============================

METexpress Version 6.2.6 upgrade instructions
---------------------------------------------

Download and deploy the new v6.2.6 docker containers from the dtcenter repository.
