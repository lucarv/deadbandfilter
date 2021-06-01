# Azure Industrial Iot - OPC UA Deadband Filter

This module can be chained on Azure IoT Edge in a pipeline after the opc publisher to effectively filter messages that fall within bookends.  
For more info OPC UA deadband, see the foundation website [here]](https://reference.opcfoundation.org/v104/Core/DataTypes/DeadbandType/)  
As of the last commit of this repo, the feature was still in the backlog for Azure IIoT team. 
Whenever this feature is implemented this becomes obsolete.  

Disclaimer: This sample is for demonstration purposes only. It has not being thouroughly tested outside sunny day scenarios.

## How does it work  
You can configure the module in one of the two available modes, **Absolute** or **Percent**. This is controlled by setting the environmental variable DBF_TYPE (percent or absolute).  
If the mode is percent, You can specify the percentage on the environmental variable (DBF_WEIGHT).  
The absolute mode needs a config file contained the bookends as below:
```
[
  {
    "ApplicationUri": "<App Uri 1",
    "OpcNodes": [
      {
        "Id": "i=<an integer>",
        "DBF": {"min": 116, "max": 118}
      },
      {
        "Id": "s=<a string>",
        "DBF": {"min": 4, "max": 6}
      },
    ]
  },
  {
    "ApplicationUri": "<App Uri 2",
    "OpcNodes": [
      {
        "Id": "i=<an integer>",
        "DBF": {"min": 116, "max": 118}
      }
    ]
  },
  <AS MANY ASSETS AS YOU NEED....>
]
```
This file needs to exist on the iot edge host and must be mounted using container creation options as usual.  

The default mode is PERCENT with a WEIGHT of 25%.  

## How to use it
Clone or download and create a module for your archtecture.  
The log files can be used to give an accurate account of what messages have been filtered out. Set verbose by assigning the environmental variable DEBUG to true. You can toggle verbose also by adding a module desired property 'debug'.
