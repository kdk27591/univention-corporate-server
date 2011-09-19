#!/usr/bin/python2.6
# -*- coding: utf-8 -*-
#
# Univention Directory Replication
#  listener module for LDAP replication
#
# Copyright 2006-2011 Univention GmbH
#
# http://www.univention.de/
#
# All rights reserved.
#
# The source code of this program is made available
# under the terms of the GNU Affero General Public License version 3
# (GNU AGPL V3) as published by the Free Software Foundation.
#
# Binary versions of this program provided by Univention to you as
# well as other copyrighted, protected or trademarked materials like
# Logos, graphics, fonts, specific documentations and configurations,
# cryptographic keys etc. are subject to a license agreement between
# you and Univention and not subject to the GNU AGPL V3.
#
# In the case you use this program under the terms of the GNU AGPL V3,
# the program is provided in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License with the Debian GNU/Linux or Univention distribution in file
# /usr/share/common-licenses/AGPL-3; if not, see
# <http://www.gnu.org/licenses/>.
# Univention LDAP Listener replication module

import os, pwd, types, ldap, ldap.schema, re, time, copy, codecs, base64
import univention_baseconfig
(utf8enc,utf8dec,utf8read,utf8write)=codecs.lookup('utf-8')

EXCLUDE_ATTRIBUTES=['subschemaSubentry', 'hasSubordinates']

# don't use built-in OIDs from slapd
BUILTIN_OIDS=[
	# attributeTypes
	'2.5.4.35',			# userPassword
	'2.5.4.3',			# cn
	'2.5.4.41',			# name
	'2.5.4.49',			# dn
	'2.5.4.1',			# aliasedObjectName
	'2.16.840.1.113730.3.1.34',	# ref (operational)
	'1.3.6.1.4.1.1466.101.120.16',	# ldapSyntaxes (operational)
	'2.5.21.8',			# matchingRuleUse
	'2.5.21.6',			# objectClasses
	'2.5.21.5',			# attributeTypes
	'2.5.21.4',			# matchingRules
	'1.3.6.1.1.5',			# vendorVersion
	'1.3.6.1.1.4',			# vendorName
	'1.3.6.1.4.1.4203.1.3.5',	# supportedFeatures
	'1.3.6.1.4.1.1466.101.120.14',	# supportedSASLMechanisms
	'1.3.6.1.4.1.1466.101.120.15',	# supportedLDAPVersion
	'1.3.6.1.4.1.1466.101.120.7',	# supportedExtension
	'1.3.6.1.4.1.1466.101.120.13',	# supportedControla
	'1.3.6.1.4.1.1466.101.120.5',	# namingContexts
	'1.3.6.1.4.1.1466.101.120.6',	# altServer
	'2.5.18.10',			# subschemaSubentry
	'2.5.18.9',			# hasSubordinates
	'2.5.18.4',			# modifiersName
	'2.5.18.3',			# creatorsName
	'2.5.18.2',			# modifyTimestamp
	'2.5.18.1',			# createTimestamp
	'2.5.21.9',			# structuralObjectClass
	'2.5.4.0',			# objectClass
	# objectClasses
	'2.5.20.1',			# subschema
	'2.5.17.0',			# subentry
	'1.3.6.1.4.1.4203.1.4.1',	# OpenLDAProotDSE
	'2.16.840.1.113730.3.2.6',	# referral
	'2.5.6.1',			# alias
	'1.3.6.1.4.1.1466.101.120.111',	# extensibleObject
	'2.5.6.0',			# top
]

def subschema_oids_with_sup(subschema, type, oid, result):
	if oid in BUILTIN_OIDS or oid in result:
		return

	obj = subschema.get_obj(type, oid)
	for i in obj.sup:
		sup_obj = subschema.get_obj(type, i)
		subschema_oids_with_sup(subschema, type, sup_obj.oid, result)
	result.append(oid)

def subschema_sort(subschema, type):

	result = []
	for oid in subschema.listall(type):
		subschema_oids_with_sup(subschema, type, oid, result)
	return result

def update_schema(attr):
	fp = open('/var/lib/univention-ldap/schema2.1.conf.new', 'w')

	queue = []

	print >>fp, '# This schema was automatically replicated from the master server'
	print >>fp, '# Please do not edit this file\n'
	subschema = ldap.schema.SubSchema(attr)

	for oid in subschema_sort(subschema, ldap.schema.AttributeType):
		if oid in BUILTIN_OIDS:
			continue
		obj = subschema.get_obj(ldap.schema.AttributeType, oid)
		print >>fp, 'attributetype', str(obj)

	for oid in subschema_sort(subschema, ldap.schema.ObjectClass):
		if oid in BUILTIN_OIDS:
			continue
		obj = subschema.get_obj(ldap.schema.ObjectClass, oid)
		print >>fp, 'objectclass', str(obj)

	fp.close()

	# move temporary file
	os.rename('/var/lib/univention-ldap/schema2.1.conf.new', '/var/lib/univention-ldap/schema2.1.conf')


if __name__ == '__main__':
	baseConfig = univention_baseconfig.baseConfig( )
	baseConfig.load( )

	lo = ldap.open(baseConfig['ldap/master'], 7389)

	res = lo.search_s( 'cn=Subschema', ldap.SCOPE_BASE, '(objectClass=*)', [ '*', '+' ] )
	for dn, attr in res:
		update_schema( attr )
