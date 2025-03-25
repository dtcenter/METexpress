============================
METexpress version |version|
============================
Developed by the `Developmental Testbed Center <https://dtcenter.org/>`_,
Boulder, CO

.. image:: _static/METplus_banner_photo_web.png

In Memoriam
-----------
This coordinated release is dedicated to three remarkable team members 
we lost in 2024, whose contributions have left an indelible mark on our work. 

To `Tara Jensen <https://dtcenter.org/news/2024/04#3032>`_, 
for her vision and leadership in creating METplus as well as her 
dedication, dogged determination, and mentorship that shaped its growth and 
trajectory, leaving a legacy of innovation in the field of verification.

To `Randy Bullock <https://dtcenter.org/news/2024/04#3031>`_, 
whose verification libraries formed the basis of MET and 
whose mathematical brilliance, passion for maps, grid projections, and 
graphics enriched and inspired new capabilities.

To `Venita Hagerty <https://sites.gsl.noaa.gov/authors/365>`_, 
for her pivotal expertise, support, and attention to 
detail that ensured the success of METdataio and METexpress.

Their contributions to METplus continue to guide and inspire us each day.

History
-------
The Model Evaluation Tools (MET) were developed by the Developmental Testbed
Center (DTC)  and released in January 2008. The goal of the tools was to
provide the community with a platform-independent and extensible framework
for reproducible verification.
The DTC partners, including NCAR, NOAA, and the USAF, decided to start by
replicating the NOAA EMC (see list of acronyms below) Mesoscale Branch
verification package, called VSDB.
In the first release, MET included several pre-processing, statistical,
and analysis tools to provide the same primary functionality as the EMC VSDB
system, and also included a spatial verification package called MODE.

Over the years, MET and VSDB packages grew in complexity.  Verification
capability at other NOAA laboratories, such as ESRL, were also under heavy
development.  An effort to unify verification capability was first started
under the HIWPP project and led by NOAA ESRL.  In 2015, the NGGPS
Program Office started working groups to focus on several aspects of the
next gen system, including the Verification and Validation Working Group.
This group made the recommendation to use MET as the foundation for a
unified verification capability.  In 2016, NCAR and GSD leads visited EMC
to gather requirements.  At that time, the concept of METplus was developed
as it extends beyond the original code base.  It was originally MET+ but
several constraints have driven the transition to the use of METplus.
METplus is now the unified verification, validation, and
diagnostics capability for NOAA's UFS and a component of NCAR's SIMA
modeling frameworks.  It is being actively developed by NCAR, ESRL, EMC
and is open to community contributions.

METplus Concept
---------------
METplus is the overarching, or umbrella, repository and hence framework for
the Unified Forecast System verification capability.  It is intended to be
extensible through adding additional capability developed by the community.
The core components of the framework include MET, the associated database and
display systems called METviewer and METexpress, and a suite of Python
wrappers to provide low-level automation and examples, also called use-cases.
A description of each tool along with some ancillary repositories are as
follows:

* **MET** - core statistical tool that matches up grids with either gridded
  analyses or point observations and applies configurable methods to compute
  statistics and diagnostics
* **METviewer**  - core database and display system intended for deep analysis
  of MET output
* **METexpress**  - core database and display system intended for quick
  analysis via pre-defined queries of MET output
* **METplus wrappers**  - suite of Python-based wrappers that provide
  low-level automation of MET tools and newly developed plotting capability
* **METplus use-cases** - configuration files and sample data to show how to
  invoke METplus wrappers to make using MET tools easier and reproducible
* **METcalcpy**  - suite of Python-based scripts to be used by other
  components of METplus tools for statistical aggregation, event
  equalization, and other analysis needs
* **METplotpy**  - suite of Python-based scripts to plot MET output,
  and in come cases provide additional post-processing of output prior
  to plotting
* **METdatadb**  - database to store MET output and to be used by both
  METviewer and METexpress

The umbrella repository will be brought together by using a software package
called `manage_externals <https://github.com/ESMCI/manage_externals>`_
developed by the Community Earth System Modeling (CESM) team, hosted at NCAR
and NOAA Earth System's Research Laboratory.  The manage_externals paackage
was developed because CESM is comprised of a number of different components
that are developed and managed independently. Each component also may have
additional "external" dependencies that need to be maintained independently.

Acronyms
--------

* **MET** - Model Evaluation Tools
* **DTC** - Developmental Testbed Center
* **NCAR** - National Center for Atmospheric Research
* **NOAA** - National Oceanic and Atmospheric Administration
* **EMC** - Environmental Modeling Center
* **VSDB** - Verification Statistics Data Base
* **MODE** - Method for Object-Based Diagnostic Evaluation
* **UFS** - Unified Forecast System
* **SIMA** -System for Integrated Modeling of the Atmosphere
* **ESRL** - Earth Systems Research Laboratory
* **HIWPP** - High Impact Weather Predication Project
* **NGGPS** - Next Generation Global Predicatio System
* **GSL** - Global Systems Laboratory


Authors
-------

Many authors, listed below in alphabetical order, have contributed to the documentation of METexpress.
To cite this documentation in publications, please refer to the METexpress User's Guide :ref:`Citation Instructions<citations>`.

* Venita Hagerty [#CIRA]_
* Jeff Hamilton [#CIRES]_
* Ian McGinnis [#CIRA]_
* Gopa Padmanabhan [#CIRA]_
* Randy Pierce [#CIRA]_
* Keith Searight [#CIRA]_
* Molly B. Smith [#CIRES]_
* Bonny Strong [#CIRA]_
* Dave Turner [#NOAA]_

.. rubric:: Organization

.. [#CIRA] `Cooperative Institute for Research in the Atmosphere at
       National Oceanic and Atmospheric Administration (NOAA) Earth 
       System Research Laboratory <https://www.esrl.noaa.gov/>`_
       
.. [#CIRES] `Cooperative Institute for Research in Environmental
       Science at the University of Colorado Boulder
       <https://cires.colorado.edu/>`_

.. [#NOAA] `National Oceanic and Atmospheric Administration
       <https://noaa.gov/>`_

.. toctree::
   :hidden:
   :caption: Training

   METplus Tutorial <https://metplus-training.readthedocs.io/en/feature_metplus2771_subprojects/Tutorial/index.html>
   Training Series <https://metplus-training.readthedocs.io/en/feature_metplus2771_subprojects/Training_Series/index.html>
   Featured Topics <https://metplus-training.readthedocs.io/en/feature_metplus2771_subprojects/Featured_Topics/index.html>
             
.. toctree::
   :hidden:
   :caption: METplus

   User's Guide <https://metplus.readthedocs.io/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/en/latest/Contributors_Guide/index.html>
   Verification Datasets Guide <https://metplus.readthedocs.io/en/latest/Verification_Datasets/index.html>
   Release Guide <https://metplus.readthedocs.io/en/latest/Release_Guide/index.html>

.. toctree::
   :hidden:
   :caption: MET

   User's Guide <https://metplus.readthedocs.io/projects/met/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/projects/met/en/latest/Contributors_Guide/index.html>

.. toctree::
   :hidden:
   :caption: METexpress

   Users_Guide/index

.. toctree::
   :hidden:
   :caption: METviewer

   User's Guide <https://metplus.readthedocs.io/projects/metviewer/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/projects/metviewer/en/latest/Contributors_Guide/index.html>

.. toctree::
   :hidden:
   :caption: METplotpy
   
   User's Guide <https://metplus.readthedocs.io/projects/metplotpy/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/projects/metplotpy/en/latest/Contributors_Guide/index.html>

.. toctree::
   :hidden:
   :caption: METcalcpy

   User's Guide <https://metplus.readthedocs.io/projects/metcalcpy/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/projects/metcalcpy/en/latest/Contributors_Guide/index.html>
   
.. toctree::
   :hidden:
   :caption: METdataio

   User's Guide <https://metplus.readthedocs.io/projects/metdataio/en/latest/Users_Guide/index.html>
   Contributor's Guide <https://metplus.readthedocs.io/projects/metdataio/en/latest/Contributors_Guide/index.html>


Index
=====

* :ref:`genindex`

  
	     
		      
