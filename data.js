window.DASHBOARD_DATA = {
  "generatedAt": "2026-06-01T09:00:00+07:00",
  "sourceWorkbook": "Local sample dataset",
  "passwords": {
    "pm": {
      "role": "project_manager",
      "label": "Project Manager",
      "projectIds": "all",
      "canEdit": true
    },
    "admin": {
      "role": "admin",
      "label": "Admin",
      "projectIds": "all",
      "canEdit": false
    },
    "client": {
      "role": "guest",
      "label": "Guest - Acme Security Assessment",
      "projectIds": [
        "project-1"
      ],
      "canEdit": false
    }
  },
  "projects": [
    {
      "id": "project-1",
      "code": "Acme Financial Services",
      "name": "Security Assessment 2026",
      "clientName": "Acme Financial Services",
      "projectStatus": "active",
      "isActive": true,
      "startDate": "2026-06-01",
      "endDate": "2026-06-30",
      "currentPhaseTask": "Security Testing",
      "nextMilestoneTask": "Executive Report Review",
      "picCywa": "Professional Project Team",
      "picClient": "Client Project Team",
      "timelineColor": "#1f5f9f",
      "branding": {
        "clientLogoUrl": "",
        "brandAccentColor": "#1f5f9f",
        "preparedFor": "Acme Financial Services",
        "preparedBy": "Professional Project Team",
        "confidentialityLabel": "Confidential — Prepared for Acme Financial Services",
        "reportFooterText": "This report is intended solely for authorized stakeholders.",
        "showClientLogo": true,
        "showCywaLogo": true
      },
      "members": [
        {
          "name": "Project Manager",
          "role": "Project Manager"
        },
        {
          "name": "Security Analyst",
          "role": "Security Testing"
        },
        {
          "name": "Client Representative",
          "role": "Client Coordinator"
        }
      ],
      "timelinePlan": [
        {
          "task": "Project Kickoff",
          "startDate": "2026-06-01",
          "endDate": "2026-06-02",
          "type": "assessment",
          "phases": []
        },
        {
          "task": "Document Review",
          "startDate": "2026-06-03",
          "endDate": "2026-06-07",
          "type": "assessment",
          "phases": []
        },
        {
          "task": "Security Testing",
          "startDate": "2026-06-08",
          "endDate": "2026-06-18",
          "type": "assessment",
          "phases": []
        },
        {
          "task": "Finding Validation",
          "startDate": "2026-06-19",
          "endDate": "2026-06-23",
          "type": "assessment",
          "phases": []
        },
        {
          "task": "Executive Report Review",
          "startDate": "2026-06-24",
          "endDate": "2026-06-27",
          "type": "reporting",
          "phases": []
        },
        {
          "task": "Final Handover",
          "startDate": "2026-06-30",
          "endDate": "2026-06-30",
          "type": "reporting",
          "phases": []
        }
      ],
      "tasks": [
        {
          "task": "Project Kickoff",
          "status": "Completed",
          "startDate": "2026-06-01",
          "endDate": "2026-06-02",
          "assignedTo": "Project Manager",
          "progress": 100,
          "notes": "Kickoff completed and project scope confirmed."
        },
        {
          "task": "Document Review",
          "status": "Completed",
          "startDate": "2026-06-03",
          "endDate": "2026-06-07",
          "assignedTo": "Security Analyst",
          "progress": 100,
          "notes": "Required project documents have been reviewed."
        },
        {
          "task": "Security Testing",
          "status": "In progress",
          "startDate": "2026-06-08",
          "endDate": "",
          "assignedTo": "Security Analyst",
          "progress": 60,
          "notes": "Testing is progressing according to plan."
        },
        {
          "task": "Finding Validation",
          "status": "Not started",
          "startDate": "",
          "endDate": "",
          "assignedTo": "Project Manager",
          "progress": 0,
          "notes": "Validation will start after testing completion."
        },
        {
          "task": "Executive Report Review",
          "status": "Not started",
          "startDate": "",
          "endDate": "",
          "assignedTo": "Project Manager",
          "progress": 0,
          "notes": "Report review is scheduled after validation."
        },
        {
          "task": "Final Handover",
          "status": "Not started",
          "startDate": "",
          "endDate": "",
          "assignedTo": "Project Manager",
          "progress": 0,
          "notes": "Final handover will be completed at project closure."
        }
      ],
      "documents": [
        {
          "id": "doc-1",
          "date": "2026-06-03",
          "name": "Project Scope Document",
          "description": "Scope, assumptions, and assessment boundaries.",
          "status": "Completed",
          "reviewStatus": ""
        },
        {
          "id": "doc-2",
          "date": "2026-06-04",
          "name": "System Inventory",
          "description": "Application and infrastructure inventory used for planning.",
          "status": "Completed",
          "reviewStatus": ""
        },
        {
          "id": "doc-3",
          "date": "2026-06-05",
          "name": "Testing Authorization",
          "description": "Formal approval for the agreed assessment activity.",
          "status": "Completed",
          "reviewStatus": ""
        },
        {
          "id": "doc-4",
          "date": "2026-06-07",
          "name": "Access Confirmation",
          "description": "Access and contact points required for execution.",
          "status": "Completed",
          "reviewStatus": ""
        },
        {
          "id": "doc-5",
          "date": "2026-06-12",
          "name": "Progress Evidence",
          "description": "Working evidence collected during execution.",
          "status": "In progress",
          "reviewStatus": "In Review"
        },
        {
          "id": "doc-6",
          "date": "",
          "name": "Final Report Input",
          "description": "Input required for final reporting and handover.",
          "status": "Not started",
          "reviewStatus": ""
        }
      ],
      "documentOutputs": [
        {
          "id": "out-1",
          "date": "2026-06-02",
          "name": "Kickoff Minutes",
          "description": "Kickoff meeting summary and agreed next steps.",
          "status": "Completed",
          "reviewStatus": ""
        },
        {
          "id": "out-2",
          "date": "2026-06-18",
          "name": "Assessment Progress Summary",
          "description": "Interim project progress summary.",
          "status": "In progress",
          "reviewStatus": "In Review"
        },
        {
          "id": "out-3",
          "date": "",
          "name": "Final Executive Report",
          "description": "Final management-level report.",
          "status": "Not started",
          "reviewStatus": ""
        }
      ],
      "meetings": [
        {
          "id": "update-1",
          "date": "2026-06-02",
          "type": "Decision",
          "note": "Kickoff completed. Scope, timeline, communication flow, and project contacts were confirmed.",
          "action": "Proceed with document review and access preparation.",
          "clientNote": "Kickoff has been completed and the project scope has been confirmed.",
          "clientAction": "Document review and access preparation will continue as scheduled.",
          "isClientVisible": true
        },
        {
          "id": "update-2",
          "date": "2026-06-07",
          "type": "Update",
          "note": "Required documents have been reviewed and execution can proceed.",
          "action": "Start security testing phase.",
          "clientNote": "Document review has been completed.",
          "clientAction": "The project will continue to the execution phase.",
          "isClientVisible": true
        },
        {
          "id": "update-3",
          "date": "2026-06-12",
          "type": "Risk / Issue",
          "note": "One evidence item requires clarification from the client team.",
          "action": "Client team to confirm the requested evidence.",
          "clientNote": "One evidence item requires additional confirmation.",
          "clientAction": "The project team will coordinate the required clarification.",
          "isClientVisible": true
        },
        {
          "id": "update-4",
          "date": "2026-06-14",
          "type": "Update",
          "note": "Internal working note for project team alignment.",
          "action": "No client action required.",
          "clientNote": "",
          "clientAction": "",
          "isClientVisible": false
        }
      ],
      "scheduleEvents": [
        {
          "id": "schedule-1",
          "title": "Project Kickoff",
          "date": "2026-06-01",
          "startTime": "09:00",
          "endTime": "10:00",
          "type": "Meeting",
          "deliveryMode": "Online",
          "location": "Teams Meeting",
          "description": "Kickoff and scope confirmation.",
          "isInternal": false
        },
        {
          "id": "schedule-2",
          "title": "Security Testing",
          "date": "2026-06-10",
          "startTime": "10:00",
          "endTime": "17:00",
          "type": "Technical Onsite",
          "deliveryMode": "Onsite",
          "location": "Client Office",
          "description": "Execution activity based on agreed scope.",
          "isInternal": false
        },
        {
          "id": "schedule-3",
          "title": "Internal Project Review",
          "date": "2026-06-14",
          "startTime": "16:00",
          "endTime": "17:00",
          "type": "Project Sync",
          "deliveryMode": "Online",
          "location": "Internal Meeting",
          "description": "Internal coordination for project team.",
          "isInternal": true
        }
      ]
    }
  ],
  "statusOptions": [
    "Not started",
    "In progress",
    "Completed",
    "On hold",
    "Blocked"
  ]
};
