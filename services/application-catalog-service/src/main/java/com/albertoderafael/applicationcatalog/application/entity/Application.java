package com.albertoderafael.applicationcatalog.application.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 20)
    private String criticality;

    @Column(nullable = false, length = 20)
    private String status;

    protected Application() {
        // Constructor requerido por JPA
    }

	public Application(
	        String name,
	        String description,
	        String criticality,
	        String status) {
	
	    this.name = name;
	    this.description = description;
	    this.criticality = criticality;
	    this.status = status;
	}

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getCriticality() {
        return criticality;
    }

    public String getStatus() {
        return status;
    }
    
	public void update(
	        String name,
	        String description,
	        String criticality,
	        String status) {
	
	    this.name = name;
	    this.description = description;
	    this.criticality = criticality;
	    this.status = status;
	}

}
