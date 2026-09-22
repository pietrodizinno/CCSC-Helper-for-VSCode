Change Log
All notable changes to the "vscode-extension-for-ccsc" extension will be documented in this file.

Check Keep a Changelog for recommendations on how to structure this file.

[Unreleased]
Added
Implementation of Flash (programming) functionality

Addition of Flash and Build & Flash tasks

Flash-related configuration items (device ID, tool path, additional arguments)

Addition of a Flash button to the status bar

MPLAB IPECMD support

Support for Java-based IPECMD (ipecmd.jar)

Standard path configuration for MPLAB v6.20

Programmer type selection (PK5, PK4, PK3, SNAP, etc.)

Programming voltage settings (3.3V, 5.0V)

Execution with the correct command format (java -jar ipecmd.jar -P18F67J94 -TPPK5 -W3.3 -F"hex_path" -M)

Automatic Java environment detection and error handling features

Automatic Java path detection (scanning common installation paths)

Java environment validation prior to Flash execution

User guidance functionality when the Java environment is not found

Display of troubleshooting information

Systematic organization of configuration settings

Grouping of related items (Basic / Build / Flash / IntelliSense / Live Linting / Error Analysis)

Hierarchy of configuration items and unification of naming conventions

Enable/disable control for the Flash feature

Automatic deletion feature for unnecessary files upon build completion

Improved memory usage display (shortened range notation, removal of duplicates)

Configurable error and warning analysis regular expression patterns

Detailed IntelliSense settings (standard, mode, compiler arguments)

Clarification of requirements and documentation improvements

Explicitly stated MPLAB X IDE requirements

Added requirements for programmers (PICkit, etc.)

Detailed the role and necessity of each component

Troubleshooting guide regarding MPLAB X IDE installation and path configuration

Changed
Unified memory usage display format (from "20% - 30%" to "20~30%")

Streamlined status bar contents (removed duplicate displays)

Changed error analysis logic to be configuration-based

Modified IntelliSense settings to be retrieved from the configuration file

Removed
Removed the unused ccscHelper.buildLogFileName configuration item

Fixed
Resolved the duplicate display issue for build memory usage

Fixed line break and extraneous character mixing issues in memory usage displays

Unified status bar presentations

[0.1.0] - 2025-06-26
Added
Basic IntelliSense support and provision of build tasks

Automatic project recognition based on .ccspjt files

Reduction of IntelliSense errors via hardcoded definitions
