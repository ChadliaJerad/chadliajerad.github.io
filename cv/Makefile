.PHONY: gen genyaml clean all cleanall

all: gen build

genyaml:
	python generate_yaml.py

clean:
	rm -rf rendercv_output/

gen: genyaml
	rendercv render "Chadlia_Jerad_CV-Ext.yaml"
	mv ./rendercv_output/Chadlia_Jerad_CV.pdf ./Chadlia_Jerad_CV-Ext.pdf
	rendercv render "Chadlia_Jerad_CV-Short.yaml"
	mv ./rendercv_output/Chadlia_Jerad_CV.pdf ./Chadlia_Jerad_CV-Short.pdf
	clean

cleanall: clean
	rm -rf ./Chadlia_Jerad_CV-Ext.pdf ./Chadlia_Jerad_CV-Short.pdf
	rm -rf ./Chadlia_Jerad_CV-Ext.yaml ./Chadlia_Jerad_CV-Short.yaml