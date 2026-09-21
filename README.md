LEBO 🛡️
Life Emergency & Backup Operator

LEBO is a personal safety and GBV support platform designed to help people before, during, and after unsafe situations.

LEBO combines proactive safety tools, emergency response, trusted contacts, safety check-ins, voice activation, support resources, and recovery tools into one privacy-focused platform.

Your safety. Your backup.

🚨 Why LEBO?

Most safety applications focus on what happens after someone is already in danger.

LEBO takes a different approach.

It is designed for everyone — whether someone simply wants additional protection while travelling, is meeting someone for the first time, is concerned about their safety, is experiencing GBV, or is recovering after abuse.

LEBO supports the full journey:

Prevent → Prepare → Protect → Respond → Recover → Rebuild

🎯 Core Concept

LEBO acts as a user's personal safety network.

A user can configure trusted contacts and create a safety plan in advance.

If the user needs help, they can trigger their predefined emergency protocol through multiple methods.

For example:

"Hey LEBO, I need help."

LEBO can then execute the user's configured emergency plan.

Depending on the user's settings, this may include:

Alerting emergency contacts

Sharing the user's location

Starting an emergency journey

Sending an SMS/push notification

Escalating an unanswered alert

Providing nearby support resources

The goal is to reduce the number of actions someone needs to take during a stressful or dangerous situation.

✨ Features
🟢 Prevention & Everyday Safety

LEBO is not exclusively for people experiencing GBV.

Users can use LEBO for everyday situations such as:

Walking home

Going to an event

Travelling alone

Going on a first date

Meeting someone new

Going out at night

Travelling to an unfamiliar location

Safe Journey

A user can tell LEBO:

"I'm going home."

The app can create a journey with:

Starting location

Destination

Expected arrival time

Optional location sharing

Check-in interval

Trusted contact

If the user doesn't confirm their arrival, LEBO can initiate the configured safety process.

⏱️ Safety Check-In

Users can create recurring or one-time safety timers.

Example:

Check on me every 2 hours.

When the timer expires:

Are you safe?

The user can select:

🟢 I'm Safe

The timer resets.

🔴 I Need Help

The emergency protocol starts.

⚠️ No Response

If the user doesn't explicitly confirm their safety within the configured grace period, LEBO can notify their selected safety contacts.

Example notification:

LEBO Safety Alert

We haven't received a safety confirmation from [Name].

Please try to contact them and confirm that they are safe.

A missed check-in should not automatically be interpreted as proof that an emergency has occurred.

🆘 Emergency Mode

LEBO provides multiple ways to activate an emergency response.

Voice

"Hey LEBO, I need help."

App

Tap the emergency button.

Other integrations

Potential future integrations include:

Smartwatches

Device shortcuts

Wearable buttons

Supported operating-system voice assistants

The emergency system should use the same predefined safety plan regardless of how it is activated.

🗣️ LEBO Voice Assistant

LEBO is designed to provide a voice-first safety experience.

Example commands:

"Hey LEBO, I need help."

"Hey LEBO, I'm safe."

"Hey LEBO, check on me in two hours."

"Hey LEBO, I'm going home."


Possible intents include:

EMERGENCY
SAFETY_CONFIRMATION
START_TIMER
START_JOURNEY
SHARE_LOCATION
CONTACT_TRUSTED_PERSON

Important

Operating systems place restrictions on third-party applications continuously listening for custom wake words.

The implementation must therefore work within the capabilities and policies of iOS and Android.

LEBO should not depend exclusively on a custom always-listening wake word.

👥 Safety Circle

Users can create a trusted network of people.

Example:

My Safety Circle

1. Mom
2. Sister
3. Best Friend


Users can configure what each contact can receive.

For example:

Mom
✓ Emergency alerts
✓ Location during emergencies

Sister
✓ Missed check-in alerts

Friend
✓ Temporary journey sharing


This gives users control over their privacy.

📍 Location Sharing

Location sharing is optional and should be controlled by the user.

Possible modes:

Temporary

Share location for:

30 minutes
1 hour
4 hours
Until stopped

Journey

Share location while a Safe Journey is active.

Emergency

Share location when an emergency protocol is activated, if the user has enabled this functionality.

LEBO should avoid unnecessary continuous location collection.

🔐 Safety Plan

Users can prepare their emergency plan before they need it.

A safety plan may contain:

Emergency contacts

Trusted contacts

Safe locations

Check-in intervals

Grace periods

Emergency preferences

Optional location-sharing preferences

Code words

Support resources

Example:

Emergency Plan

Primary contact:
Mom

Secondary contact:
Sister

Emergency location sharing:
Enabled

Check-in grace period:
15 minutes

Safe location:
Sister's house

🆘 Code Word

Users can configure a discreet emergency phrase.

For example:

"Send the blue message."

The phrase can trigger a predefined action without requiring the user to openly state that they are in danger.

The exact implementation should be designed carefully around privacy, authentication, accidental activation, and operating-system limitations.

🏠 Find Help

LEBO can provide access to verified support resources.

Potential categories:

Emergency services

Police stations

Hospitals

Shelters

Counselling

Legal assistance

GBV organisations

Social services

Campus support

Workplace support

Resources should be verified and regularly maintained.

🔴 LEBO for People Experiencing Abuse

LEBO can provide tools for someone currently experiencing GBV.

Features may include:

Emergency activation

Safety Circle

Safety Timer

Discreet communication

Safe Journey

Location sharing

Safety planning

Support resources

Safe-place discovery

Evidence organisation

Digital safety guidance

LEBO should not require someone to formally report abuse before accessing support information.

🔵 LEBO for Survivors

LEBO also supports people after abuse.

Recovery Mode

Possible tools include:

Counselling resources

Support groups

Legal resources

Housing resources

Financial-support resources

Post-separation safety planning

Digital-security checklists

Recovery journaling

Personal goals

The purpose is not simply to document abuse, but to help users rebuild safety and independence.

📁 Evidence & Incident Records

Users may optionally document incidents.

Potential records include:

Notes

Photos

Screenshots

Documents

Audio

Videos

Each record can contain:

Date
Time
Description
Attachments


Sensitive records must be protected through appropriate encryption and access controls.

The application should clearly communicate the risks of storing sensitive evidence on a device that another person may be able to access.

📱 Privacy & Security

Privacy is a core product requirement.

LEBO should follow a data-minimisation principle.

Security requirements

Encryption in transit

Encryption at rest

Secure authentication

Secure token storage

Device-level protections

Role-based access control

Audit logging

Short-lived access tokens

Protected file storage

Minimal personal-data collection

Sensitive information

LEBO may process highly sensitive information, including:

Locations

Emergency contacts

Incident records

Documents

Safety plans

This information must be treated as sensitive by design.

🏗️ Technology Stack
Mobile

React Native

TypeScript

Swift for required iOS native functionality

Kotlin for required Android native functionality

Backend

Node.js

NestJS

TypeScript

Database

PostgreSQL

PostGIS where geographic queries are required

Authentication

AWS Cognito

Cloud

AWS

Potential services:

AWS Lambda
API Gateway
RDS PostgreSQL
S3
SQS
EventBridge
KMS
CloudWatch

Background Jobs

Redis

BullMQ

Used for:

Safety timers

Check-in processing

Escalation

Notification workflows

Notifications

Firebase Cloud Messaging

SMS provider such as Twilio

Maps

Potential options:

Google Maps Platform

Mapbox

Native platform mapping APIs

Admin Dashboard

Next.js

TypeScript

Monitoring

Sentry

AWS CloudWatch

CI/CD

GitHub Actions

🧩 System Architecture
                    ┌────────────────────┐
                    │      LEBO App      │
                    │   iOS + Android    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │     API Gateway    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   LEBO Backend     │
                    │ Node.js / NestJS   │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
 PostgreSQL                Redis              AWS Services
        │                     │                     │
        │                     ▼                     │
        │              Safety Engine                │
        │                     │                     │
        └──────────────┬──────┴─────────────────────┘
                       │
              ┌────────▼────────┐
              │ Notification    │
              │     Engine      │
              └────────┬────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
          Push/SMS          Trusted Contacts

🔄 Emergency Workflow
User
 │
 │ "Hey LEBO, I need help"
 ▼
LEBO Voice Interface
 │
 ▼
Emergency Intent
 │
 ▼
Emergency Engine
 │
 ├──► Verify emergency configuration
 │
 ├──► Retrieve Safety Circle
 │
 ├──► Retrieve location permissions
 │
 ├──► Create emergency event
 │
 └──► Trigger notifications
          │
          ├──► Contact #1
          ├──► Contact #2
          └──► Additional escalation

⏱️ Safety Timer Workflow
User starts timer
        │
        ▼
Backend creates timer
        │
        ▼
Timer reaches check-in time
        │
        ▼
Send notification
        │
        ▼
     Are you safe?
      /         \
     /           \
 I'm Safe      No response
    │              │
    ▼              ▼
Reset timer    Grace period
                   │
                   ▼
              Still no response
                   │
                   ▼
             Safety Alert
                   │
                   ▼
            Safety Circle

🗂️ Suggested Repository Structure
lebo/
│
├── apps/
│   ├── mobile/
│   │   ├── ios/
│   │   ├── android/
│   │   └── src/
│   │
│   └── admin/
│       └── src/
│
├── services/
│   └── api/
│       └── src/
│
├── packages/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── shared/
│
├── infrastructure/
│   ├── aws/
│   └── database/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── api/
│   └── product/
│
├── tests/
│
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md

🚀 Development Roadmap
Phase 1 — MVP

 User authentication

 Emergency contacts

 Safety Circle

 Safety Timer

 "I'm Safe" confirmation

 Missed-check-in detection

 Emergency alerts

 Basic location sharing

 Safe Journey

 Basic support directory

 Privacy controls

Phase 2 — Safety Expansion

 LEBO voice commands

 Code words

 Advanced escalation

 Discreet mode

 Digital safety tools

 Safe-place discovery

 Multilingual support

 Recovery Mode

Phase 3 — Advanced Integrations

 Wearable support

 Platform voice-assistant integration

 Advanced journey monitoring

 Institution/university integrations

 Professional support network

 Expanded regional support

⚠️ Safety Principles

LEBO is a safety tool, not a replacement for emergency services, healthcare professionals, law enforcement, legal professionals, or trained support organisations.

The application should:

Never assume that a missed check-in means an emergency.

Avoid automatically contacting authorities unless explicitly configured and legally/technically appropriate.

Give users control over their safety settings.

Minimise unnecessary data collection.

Clearly communicate what information is being shared.

Avoid exposing sensitive information through notifications.

Fail safely when connectivity is unavailable.

Avoid relying on AI for critical emergency decisions.

🤖 AI Principles

AI may be used for secondary experiences such as:

Education

Resource discovery

General support information

Multilingual assistance

Explaining safety concepts

AI should not be responsible for deciding whether an emergency alert should be sent.

Critical safety workflows should be deterministic.

For example:

"I need help"
      ↓
EMERGENCY INTENT
      ↓
EXECUTE USER'S CONFIGURED SAFETY PLAN


rather than:

"I need help"
      ↓
AI decides whether the user sounds serious
      ↓
Maybe send alert

🎯 Product Vision

LEBO aims to create a safety ecosystem that supports people throughout different stages of their lives.

                 LEBO
                   │
       ┌───────────┼───────────┐
       │           │           │
    PREVENT     PROTECT     RESPOND
       │           │           │
       └───────────┼───────────┘
                   │
                RECOVER
                   │
                REBUILD


The ultimate goal is simple:

Everyone deserves to feel safe, have a plan, and know that someone will hear them when they ask for help.

📄 License

License to be determined.

👥 Project Status

Status: Early-stage / MVP development

LEBO is currently being designed as a privacy-first personal safety and GBV support platform.

Contributions, architecture discussions, security reviews, and product feedback are welcome as the project develops.
